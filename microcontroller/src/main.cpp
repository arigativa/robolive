#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// default address 0x40
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

const int SERVOMIN = 110; // This is the 'minimum' pulse length count (out of 4096)
const int SERVOMAX = 480; // This is the 'maximum' pulse length count (out of 4096)
const int ANGLEMIN = 0;
const int ANGLEMAX = 180;
const int SERVO_FREQ = 50; // Analog servos run at ~50 Hz updates
const uint8_t servonum = 15;

void setup() {
    Serial.begin(9600);
    pwm.begin();
    pwm.setOscillatorFrequency(27000000);
    pwm.setPWMFreq(SERVO_FREQ);  // Analog servos run at ~50 Hz updates
    pwm.setPWM(servonum, 0, SERVOMIN);

    delay(10);
}

void loop() {
    boolean isAngleSet = false;
    int pulse = 0;

    if (Serial.available() > 0) {
        int angle = Serial.parseInt();
        angle = constrain(angle, ANGLEMIN, ANGLEMAX);
        pulse = map(angle, ANGLEMIN, ANGLEMAX, SERVOMIN, SERVOMAX);
        isAngleSet = true;
        Serial.print("Turning on angle: ");
        Serial.println(angle, DEC);
    }

    if (isAngleSet) {
        pwm.setPWM(servonum, 0, pulse);
    }
}
