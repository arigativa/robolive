#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <SoftwareSerial.h>

// RX, TX
SoftwareSerial mySerial(2, 3);

// default address 0x40
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

const int SERVOMIN = 110; // This is the 'minimum' pulseLength length count (out of 4096)
const int SERVOMAX = 480; // This is the 'maximum' pulseLength length count (out of 4096)
const int PIN_INDEX_MIN = 0;
const int PIN_INDEX_MAX = 16;
const int SERVO_FREQ = 50; // Analog servos run at ~50 Hz updates

boolean isRoombaMode = false;

struct PWMCommand {
    const int pinIndex;
    const int pulseLength;
};

struct SerialCommand {
    const int bytesToRead;
};

PWMCommand parseSetPWMCommand(const String& rawInput) {
    const int delimPos = rawInput.indexOf(' ');
    if (delimPos > 0) {
        const int pinIndex = rawInput.substring(0, delimPos).toInt();
        const int pulseLen = rawInput.substring(delimPos + 1).toInt();
        const PWMCommand command = {pinIndex, pulseLen};
        return command;
    } else {
        const PWMCommand command = {-1, -1};
        return command;
    }
}

SerialCommand parseSerialInputCommand(const String& rawInput) {
    const int delimPos = rawInput.indexOf(':');
    if (delimPos > 0) {
        const auto bytesToRead = rawInput.substring(delimPos + 1).toInt();
        const SerialCommand command = { bytesToRead };
        return command;
    } else {
        const SerialCommand command = { 0 };
        return command;
    }
}

boolean isRoombaStart(const String& rawInput) {
    return rawInput.startsWith("roomba-start");
}

boolean isSerial(const String& rawInput) {
    return rawInput.startsWith("serial");
}

boolean isReset(const String& rawInput) {
    return rawInput.equals("reset");
}

void setup() {
    Serial.begin(9600);
    while (!Serial) {
        ; // wait for serial port to connect. Needed for Native USB only
    }
    Serial.println("arduino_driver.cpp, 19 Apr 2021");

    pwm.begin();
    pwm.setOscillatorFrequency(27000000);
    pwm.setPWMFreq(SERVO_FREQ);  // Analog servos run at ~50 Hz updates
    delay(10);

}

void reset() {
    pwm.reset();
}

bool setPWM(int id, int pulseLength) {
    boolean isPulseLengthAllowed = pulseLength >= SERVOMIN && pulseLength < SERVOMAX;
    boolean isServoIndexAllowed = id >= PIN_INDEX_MIN && id <= PIN_INDEX_MAX;
    if (isPulseLengthAllowed && isServoIndexAllowed) {
        pwm.setPWM(id, 0, pulseLength);
        return true;
    } else {
        return false;
    }
}

void startRoomba() {
    // Start roomba
    mySerial.begin(19200);
    mySerial.write(0x80);
    delay(50);
    mySerial.write(0x82);
    delay(50);
    mySerial.write(0x8d);
    mySerial.write((int) 0x00);
}

void loop() {
    if (Serial.available() > 0) {
        const String rawInput = Serial.readStringUntil('\n');
        if (isReset(rawInput)) {
            reset();
            Serial.println("pwm driver has been reset");
        } else if (isRoombaStart(rawInput)) {
            startRoomba();
            Serial.println("roomba started");
        } else if (isSerial(rawInput)) {
            const auto command = parseSerialInputCommand(rawInput);
            char *buffer = (char*) malloc(command.bytesToRead);
            int bytesCounter = 0;
            do {
                bytesCounter += Serial.readBytes(buffer + bytesCounter, command.bytesToRead - bytesCounter);
            } while (bytesCounter < command.bytesToRead);
            mySerial.write(buffer, command.bytesToRead);
            mySerial.flush();
            free(buffer);
            Serial.println("sent");
        } else {
            const auto command = parseSetPWMCommand(rawInput);
            const boolean isPWMSet = setPWM(command.pinIndex, command.pulseLength);
            if (isPWMSet) {
                Serial.print("set PWM ");
                Serial.print(command.pinIndex);
                Serial.print(" pulseLength to ");
                Serial.println(command.pulseLength);
            } else {
              Serial.println(rawInput);
                Serial.println("invalid parameters");
            }
        }
    } else {
      int available = mySerial.available();
      if (available) {
            char *buffer = (char*) malloc(available);
            mySerial.readBytes(buffer, available);
            Serial.print(String("roomba:" + String(available) + "\n"));
            Serial.write(buffer, available);
            free(buffer);
      }
    }
}
