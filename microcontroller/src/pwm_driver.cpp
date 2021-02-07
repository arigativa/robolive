#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// default address 0x40
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

const int SERVOMIN = 110; // This is the 'minimum' pulseLength length count (out of 4096)
const int SERVOMAX = 480; // This is the 'maximum' pulseLength length count (out of 4096)
const int PIN_INDEX_MIN = 0;
const int PIN_INDEX_MAX = 16;
const int SERVO_FREQ = 50; // Analog servos run at ~50 Hz updates


struct Command {
    int pinIndex;
    int pulseLength;
};

Command parseSetPWMCommand(const String& rawInput) {
    const int delimPos = rawInput.indexOf(' ');
    if (delimPos > 0) {
        const int pinIndex = rawInput.substring(0, delimPos).toInt();
        const int pulseLen = rawInput.substring(delimPos + 1).toInt();
        const Command command = {pinIndex, pulseLen};
        return command;
    } else {
        const Command command = {-1, -1};
        return command;
    }
}

boolean isReset(const String& rawInput) {
    return rawInput.equals("reset");
}

void setup() {
    Serial.begin(9600);
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

void loop() {
    if (Serial.available() > 0) {
        const String rawInput = Serial.readStringUntil('\n');
        if (isReset(rawInput)) {
            reset();
            Serial.println("pwm driver has been reset");
        } else {
            const auto command = parseSetPWMCommand(rawInput);
            const boolean isPWMSet = setPWM(command.pinIndex, command.pulseLength);
            if (isPWMSet) {
                Serial.print("set PWM ");
                Serial.print(command.pinIndex);
                Serial.print(" pulseLength to ");
                Serial.println(command.pulseLength);
            } else {
                Serial.println("invalid parameters");
            }
        }
    }
}
