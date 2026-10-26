"""Transform only the native cover's presentation; source stays private/on-device."""


def patch(source):
    changes = [
        ('    color: "black"', '''    property bool personalFailed: false
    property bool personalFadeRequested: false
    property bool personalIntro: !personalFailed && !systemProperties.isStolenDevice
                                && !!systemProperties.appToLaunch
                                && systemProperties.appToLaunch.id === "com.reframe.home"

    color: "black"

    Loader {
        id: personalLoader
        anchors.fill: parent
        active: root.personalIntro
        source: "PersonalMark.qml"
        onStatusChanged: {
            if (status === Loader.Error) {
                console.log("REFRAME_NATIVE_INTRO component-error; native fallback");
                root.personalFailed = true;
            }
        }
    }
    Connections {
        target: personalLoader.item
        ignoreUnknownSignals: true
        onReadyToFade: { if (root.personalFadeRequested) root.startFade(); }
    }
    Timer {
        id: personalGuard
        interval: 3500
        onTriggered: { root.personalFailed = true; root.startFade(); }
    }'''),
        ('        visible: !blockUI.visible', '        visible: !blockUI.visible && !root.personalIntro'),
        ('            duration: 500', '            duration: root.personalIntro ? 0 : 500'),
        ('            duration: 1500', '            duration: root.personalIntro ? 350 : 1500'),
        ('    function startFade() {', '''    function startFade(force) {
        if (!force && root.personalIntro && personalLoader.status !== Loader.Error
                && (!personalLoader.item || !personalLoader.item.finished)) {
            root.personalFadeRequested = true;
            if (!personalGuard.running) personalGuard.start();
            return;
        }
        personalGuard.stop();
        console.log("REFRAME_NATIVE_INTRO fade; personal=" + root.personalIntro);'''),
        ('    function startFadeAnimation() {', '    function startFadeAnimation(force) {'),
        ('        root.startFade();', '        root.startFade(force);'),
        ('        onAboutToClose: {\n            root.startFadeAnimation();',
         '        onAboutToClose: {\n            root.startFadeAnimation(true);'),
    ]
    for old, new in changes:
        if source.count(old) != 1:
            raise ValueError("Native cover differs from the reviewed structure; refusing patch: " + old)
        source = source.replace(old, new, 1)
    return source


def patch_direct(source):
    """Hide only Reframe's cover artwork and close it as soon as LG is ready.

    Keep the original launch/readiness/failure paths and stolen-device UI.
    No personal QML loader, timer, drawing or minimum display time is added.
    """
    changes = [
        ('    color: "black"', '''    property bool reframeDirect: !systemProperties.isStolenDevice
                                 && !!systemProperties.appToLaunch
                                 && systemProperties.appToLaunch.id === "com.reframe.home"

    color: "black"'''),
        ('        visible: !blockUI.visible', '        visible: !blockUI.visible && !root.reframeDirect'),
        ('            duration: 500', '            duration: root.reframeDirect ? 0 : 500'),
        ('            duration: 1500', '            duration: root.reframeDirect ? 0 : 1500'),
    ]
    for old, new in changes:
        if source.count(old) != 1:
            raise ValueError("Native cover structure changed; refusing direct patch: " + old)
        source = source.replace(old, new, 1)
    return source
