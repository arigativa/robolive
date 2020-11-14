#include <Servo.h>
#include <Arduino.h>


struct Command {
    int digitalPinNumber;
    int angle;
    int timeOpenedInMs;
};

struct State {
    int initializedPin{}; // -1 for uninitialized
    Command lastCommand{};
    boolean lastCommandExecuted = true;
    Servo servo;
};

State state;

void setup() {
    Serial.begin(9600);
}

Command parseCommand(const String& rawInput) {
    const int pinIndex = rawInput.indexOf(':');
    const String pinRaw = rawInput.substring(0, pinIndex);

    const int angleIndex = rawInput.indexOf(':', pinIndex + 1);
    const String angleRaw = rawInput.substring(pinIndex + 1, angleIndex);

    const String timeOpenedRaw = rawInput.substring(angleIndex + 1, rawInput.length());

    const Command command = {pinRaw.toInt(), angleRaw.toInt(), timeOpenedRaw.toInt()};

    return command;
}

void loop() {
    if (Serial.available() > 0) {
        const String rawInput = Serial.readStringUntil('\n');
        const Command command = parseCommand(rawInput);
        Serial.print("Pin: ");
        Serial.println(command.digitalPinNumber, DEC);
        Serial.print("Angle: ");
        Serial.println(command.angle, DEC);
        Serial.print("Time: ");
        Serial.println(command.timeOpenedInMs, DEC);
        state.lastCommand = command;
        state.lastCommandExecuted = false;
        if (command.digitalPinNumber != state.initializedPin) {
            Serial.print("Initializing servo to pin: ");
            Serial.println(command.digitalPinNumber, DEC);
            state.initializedPin = command.digitalPinNumber;
            state.servo.attach(state.initializedPin);
            delay(10);
        }
    }

    if (!state.lastCommandExecuted) {
        Serial.print("Turning servo on angle: ");
        Serial.println(state.lastCommand.angle, DEC);
        state.servo.write(state.lastCommand.angle);
        state.lastCommandExecuted = true;
    }
}
