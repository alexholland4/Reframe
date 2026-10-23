// Alex Holland's portfolio SVG geometry and original staggered cubic-bezier draw.
import QtQuick 2.12

Item {
    id: mark
    property bool finished: false
    property bool initialized: false
    signal readyToFade()

    function begin() {
        finished = false;
        hold.stop();
        for (var i = 0; i < strokes.count; ++i) strokes.itemAt(i).begin();
        console.log("REFRAME_NATIVE_INTRO draw-start");
    }
    onVisibleChanged: {
        if (!initialized) return;
        if (visible) begin();
        else {
            hold.stop();
            for (var i = 0; i < strokes.count; ++i) strokes.itemAt(i).stop();
        }
    }
    Component.onCompleted: { initialized = true; if (visible) begin(); }
    Timer {
        id: hold
        interval: 280
        onTriggered: {
            mark.finished = true;
            console.log("REFRAME_NATIVE_INTRO draw-complete");
            mark.readyToFade();
        }
    }
    Item {
        id: canvas
        width: mark.width * 0.25
        height: width
        anchors.centerIn: parent
        property real unit: width / 328
        Repeater {
            id: strokes
            model: [
                [154, 44, 43, 264], [154, 44, 203, 150], [96, 180, 138, 180],
                [154, 118, 154, 264], [150, 180, 268, 180], [268, 60, 268, 264]
            ]
            delegate: Item {
                id: line
                property real progress: 0
                property real dx: modelData[2] - modelData[0]
                property real dy: modelData[3] - modelData[1]
                x: modelData[0] * canvas.unit
                y: modelData[1] * canvas.unit
                rotation: Math.atan2(dy, dx) * 180 / Math.PI
                transformOrigin: Item.TopLeft
                function begin() { draw.stop(); progress = 0; draw.start(); }
                function stop() { draw.stop(); }
                Rectangle {
                    property real thickness: 22 * canvas.unit
                    x: -thickness / 2
                    y: -thickness / 2
                    width: Math.sqrt(line.dx * line.dx + line.dy * line.dy) * canvas.unit * line.progress + thickness
                    height: thickness
                    radius: thickness / 2
                    visible: line.progress > 0
                    color: "#F3F2EA"
                    antialiasing: true
                }
                SequentialAnimation {
                    id: draw
                    PauseAnimation { duration: 350 + index * 170 }
                    NumberAnimation {
                        target: line
                        property: "progress"
                        from: 0
                        to: 1
                        duration: 620
                        easing.type: Easing.BezierSpline
                        easing.bezierCurve: [0.22, 1, 0.36, 1, 1, 1]
                    }
                    onFinished: { if (index === 5) hold.restart(); }
                }
            }
        }
    }
}
