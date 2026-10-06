// MOONGS ESP32-C3 BLE 펌웨어
// 웹앱(src/App.tsx)의 BLE 연동 방식에 맞춤:
//   - Service UUID        : FFE0
//   - Characteristic UUID : FFE1 (Notify)
//   - 데이터 형식          : "p1,p2,p3,p4,minX,maxX,minY,maxY\n"  (값 범위 0~1023)
// USB 시리얼(Web Serial)로도 같은 줄을 출력합니다.

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>

// 함수 원형 (Arduino 자동 원형 생성에 의존하지 않도록 직접 선언)
void setup();
void loop();
int readPiezo(int pin);
void readImu(int *imu);

// ===== 설정 =====
#define DEVICE_NAME "MOONGS-Cast"   // 블루투스 이름

// ESP32-C3에서 analogRead 가능한 핀은 ADC1(GPIO0~4)뿐입니다.
// GPIO5 이상(ADC2)은 "adc unit not supported" 에러가 납니다.
const int PIEZO_PINS[4] = {0, 1, 2, 3};   // TODO: 실제 배선에 맞게 수정

#define SEND_INTERVAL_MS 50
// ================

#define SERVICE_UUID "0000ffe0-0000-1000-8000-00805f9b34fb"
#define CHAR_UUID    "0000ffe1-0000-1000-8000-00805f9b34fb"

BLECharacteristic *dataChar = nullptr;
bool bleConnected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override { bleConnected = true; }
  void onDisconnect(BLEServer *server) override {
    bleConnected = false;
    BLEDevice::startAdvertising();  // 연결이 끊기면 다시 광고
  }
};

// ESP32-C3 ADC(0~4095)를 웹앱 기준(0~1023)으로 변환
int readPiezo(int pin) {
  return analogRead(pin) >> 2;
}

// TODO: IMU 연결 후 실제 값으로 교체 — imu[] = {minX, maxX, minY, maxY}
void readImu(int *imu) {
  for (int i = 0; i < 4; i++) imu[i] = 0;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);

  BLEDevice::init(DEVICE_NAME);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);
  dataChar = service->createCharacteristic(
      CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  dataChar->addDescriptor(new BLE2902());
  service->start();

  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("BLE advertising as " DEVICE_NAME);
}

void loop() {
  int p[4];
  for (int i = 0; i < 4; i++) p[i] = readPiezo(PIEZO_PINS[i]);

  int imu[4];
  readImu(imu);

  char line[64];
  snprintf(line, sizeof(line), "%d,%d,%d,%d,%d,%d,%d,%d\n",
           p[0], p[1], p[2], p[3], imu[0], imu[1], imu[2], imu[3]);

  Serial.print(line);

  if (bleConnected) {
    // 기본 MTU(20바이트)에 맞춰 나눠 전송 — 웹앱이 줄바꿈 기준으로 다시 합칩니다.
    size_t len = strlen(line);
    for (size_t i = 0; i < len; i += 20) {
      size_t n = min((size_t)20, len - i);
      dataChar->setValue((uint8_t *)line + i, n);
      dataChar->notify();
    }
  }

  delay(SEND_INTERVAL_MS);
}
