/*
 * MOONGS Smart Cast - ESP32-C3 펌웨어
 * ---------------------------------------------------------------
 * 보드/배선 근거: 2026-09-17 Arduino IDE 빌드 캐시(sketch_sep17a)에서 확인
 *   fqbn esp32:esp32:esp32c3 (CDCOnBoot=cdc)
 *   PIEZO_FRONT_1 = GPIO2, PIEZO_FRONT_2 = GPIO1, PIEZO_REAR_AVG = GPIO0
 *
 * 이 스케치가 고치는 문제
 *  1) BLE 미구현  : 기존 펌웨어는 UART 출력만 했으므로 광고하는 BLE 기기가
 *                   없어 웹앱의 "블루투스 기기 연결"이 기기를 찾지 못했다.
 *                   -> Nordic UART Service(NUS)로 MOONGS-Cast 이름으로 광고한다.
 *  2) 출력 형식    : "Piezo_X:.." 형식은 앱 파서(src/lib/telemetry.ts)가 압력으로
 *                   인식하지 못해 프레임이 버려졌다(IMU 값만 반영됨).
 *                   -> 앱의 4채널 경로(센서1·2 = 앞꿈치, 센서3·4 = 뒤꿈치)에 맞춰
 *                      "앞1,앞2,뒤,뒤" 로 보낸다. 뒤꿈치 센서는 하나뿐이라 3·4 에
 *                      같은 값을 넣는다. 앱은 앞꿈치 = avg(1,2), 뒤꿈치 = avg(3,4).
 *  3) ADC 에러     : adc_oneshot_new_unit(92) "adc unit not supported" 가 루프마다
 *                   출력됐다. ESP32-C3 의 ADC2(GPIO5 단일 채널)는 IDF 5.x 에서
 *                   비활성화되어 있어 analogRead(5) 가 항상 실패한다.
 *                   -> 이 스케치는 ADC1 채널(GPIO0~4)만 사용한다.
 *
 * 앱으로 나가는 한 프레임(개행으로 끝남):
 *   120,340,980,980,IMU_X:0.12,IMU_Y:-0.03,IMU_Z:9.78
 *
 * 빌드: Arduino IDE / arduino-cli, ESP32 보드 패키지 3.x
 */

#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

// ── 앱이 찾는 BLE 규격 (src/lib/bluetooth.ts 의 sensorServices 와 일치해야 함) ──
#define NUS_SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define NUS_RX_UUID      "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  // 앱 -> 기기
#define NUS_TX_UUID      "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  // 기기 -> 앱 (notify)
#define DEVICE_NAME      "MOONGS-Cast"

// ── 압전 센서 핀: 반드시 ADC1 채널이어야 한다 ──────────────────────────────
#if CONFIG_IDF_TARGET_ESP32C3
  // 실제 배선 (빌드 캐시에서 확인). ESP32-C3 ADC1 = GPIO0~GPIO4
  static const int PIN_FRONT1 = 2, PIN_FRONT2 = 1, PIN_REAR = 0;
  static const int PIN_SDA = 8, PIN_SCL = 9;   // C3 DevKitM / SuperMini 기본 I2C
#elif CONFIG_IDF_TARGET_ESP32S3
  // 미확인 보드용 자리표시자. ESP32-S3 ADC1 = GPIO1~GPIO10
  static const int PIN_FRONT1 = 1, PIN_FRONT2 = 2, PIN_REAR = 3;
  static const int PIN_SDA = 8, PIN_SCL = 9;
#else
  // 미확인 보드용 자리표시자. ESP32 클래식 ADC1 = GPIO32~GPIO39
  static const int PIN_FRONT1 = 32, PIN_FRONT2 = 33, PIN_REAR = 34;
  static const int PIN_SDA = 21, PIN_SCL = 22;
#endif

static const uint32_t SAMPLE_INTERVAL_MS = 100;   // 10Hz
static const uint8_t  MPU_ADDR_A = 0x68, MPU_ADDR_B = 0x69;

BLECharacteristic* txChar = nullptr;
bool bleConnected = false;
uint8_t imuAddr = 0;          // 0 = IMU 없음

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) override    { bleConnected = true;  Serial.println("# BLE 연결됨"); }
  void onDisconnect(BLEServer* s) override {
    bleConnected = false;
    Serial.println("# BLE 연결 해제 - 광고 재시작");
    BLEDevice::startAdvertising();          // 재연결 가능하도록 광고를 다시 켠다
  }
};

// ── I2C 보조 함수 ────────────────────────────────────────────────────────
static bool i2cPresent(uint8_t addr) {
  Wire.beginTransmission(addr);
  return Wire.endTransmission() == 0;
}

static void imuInit() {
  Wire.begin(PIN_SDA, PIN_SCL, 400000);

  // 부팅 시 I2C 스캔: IMU 가 계속 0 으로 나오는 원인을 바로 확인할 수 있다.
  Serial.println("# I2C 스캔 시작");
  int found = 0;
  for (uint8_t a = 1; a < 127; a++) {
    if (i2cPresent(a)) { Serial.printf("#   장치 발견: 0x%02X\n", a); found++; }
  }
  if (!found) Serial.println("#   I2C 장치 없음 - IMU 배선(SDA/SCL/전원)을 확인하세요");

  imuAddr = i2cPresent(MPU_ADDR_A) ? MPU_ADDR_A : (i2cPresent(MPU_ADDR_B) ? MPU_ADDR_B : 0);
  if (!imuAddr) { Serial.println("# MPU6050 미검출 - IMU 값은 0 으로 전송됩니다"); return; }

  Wire.beginTransmission(imuAddr);           // PWR_MGMT_1 = 0 (sleep 해제)
  Wire.write(0x6B); Wire.write(0x00);
  Wire.endTransmission();
  Serial.printf("# MPU6050 초기화 완료 (0x%02X)\n", imuAddr);
}

// 가속도를 m/s^2 로 반환. IMU 가 없으면 0 을 채운다.
static void imuRead(float& x, float& y, float& z) {
  x = y = z = 0.0f;
  if (!imuAddr) return;

  Wire.beginTransmission(imuAddr);
  Wire.write(0x3B);                                  // ACCEL_XOUT_H
  if (Wire.endTransmission(false) != 0) return;
  if (Wire.requestFrom((int)imuAddr, 6, true) != 6) return;

  int16_t rx = (Wire.read() << 8) | Wire.read();
  int16_t ry = (Wire.read() << 8) | Wire.read();
  int16_t rz = (Wire.read() << 8) | Wire.read();

  const float SCALE = 9.80665f / 16384.0f;           // ±2g 설정 기준
  x = rx * SCALE; y = ry * SCALE; z = rz * SCALE;
}

// ── BLE 전송: 기본 MTU(23)에서도 잘리지 않도록 20바이트씩 쪼갠다 ──────────
// 앱의 SensorTextBuffer 가 개행을 만날 때까지 이어 붙이므로 분할해도 안전하다.
static void bleSend(const char* text, size_t len) {
  if (!bleConnected || !txChar) return;
  const size_t CHUNK = 20;
  for (size_t off = 0; off < len; off += CHUNK) {
    size_t n = (len - off < CHUNK) ? (len - off) : CHUNK;
    txChar->setValue((uint8_t*)(text + off), n);
    txChar->notify();
    delay(4);                                        // 스택 큐가 넘치지 않도록
  }
}

void setup() {
  Serial.begin(115200);
#if ARDUINO_USB_MODE && ARDUINO_USB_CDC_ON_BOOT
  // USB 가 꽂혀 있는데 호스트가 포트를 열지 않으면 HWCDC write() 는 한 번에
  // 최대 20 x 100ms(2초)를 기다린다(core 3.3.x HWCDC.cpp). 그 동안 loop() 와
  // BLE 콜백이 멈춰 블루투스 전송이 0.5Hz 로 떨어지므로 USB 출력은 기다리지 않는다.
  Serial.setTxTimeoutMs(0);
#endif
  delay(300);
  Serial.println("\n# MOONGS-Cast 부팅");

  analogReadResolution(12);                          // 0~4095
  imuInit();

  BLEDevice::init(DEVICE_NAME);
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService* svc = server->createService(NUS_SERVICE_UUID);

  // NOTIFY 속성을 주면 NimBLE 이 CCCD(0x2902)를 자동으로 붙인다.
  txChar = svc->createCharacteristic(NUS_TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);

  svc->createCharacteristic(NUS_RX_UUID,
      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);

  svc->start();

  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(NUS_SERVICE_UUID);             // 서비스 UUID 를 광고에 실어야 앱이 찾는다
  adv->setScanResponse(true);
  adv->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  Serial.printf("# BLE 광고 시작: %s\n", DEVICE_NAME);
  Serial.println("# 형식: 앞1,앞2,뒤,뒤,IMU_X:..,IMU_Y:..,IMU_Z:..");
}

void loop() {
  // ADC1 채널만 읽으므로 adc_oneshot 에러가 발생하지 않는다.
  int front1 = analogRead(PIN_FRONT1);
  int front2 = analogRead(PIN_FRONT2);
  int rear   = analogRead(PIN_REAR);

  float ix, iy, iz;
  imuRead(ix, iy, iz);

  // 뒤꿈치 센서는 하나뿐이므로 앱의 센서3·4 자리에 같은 값을 넣는다.
  char frame[96];
  int len = snprintf(frame, sizeof(frame),
                     "%d,%d,%d,%d,IMU_X:%.2f,IMU_Y:%.2f,IMU_Z:%.2f\n",
                     front1, front2, rear, rear, ix, iy, iz);
  if (len < 0) return;
  if (len > (int)sizeof(frame) - 1) len = sizeof(frame) - 1;

  // USB 연결용. 버퍼에 한 프레임이 통째로 들어갈 때만 써서 줄이 잘리지 않게 한다.
  if (Serial.availableForWrite() >= len) Serial.write(frame, len);
  bleSend(frame, len);             // BLE 연결용 (블루투스 기기 연결)

  delay(SAMPLE_INTERVAL_MS);
}
