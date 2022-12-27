var AudioConfig = /** @class */ (function () {
    function AudioConfig() {
        // this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.ctx = new (window.AudioContext);
        this.setDeviceId();
        console.log('deviceId', this.deviceId);
        this.initializeAudio();
    }
    AudioConfig.prototype.setDeviceId = function () {
        var _this = this;
        var eligibleDevices = [
            '',
            'Built-in Microphone'
        ];
        function deviceFound(label) {
            for (var i = 0; i < eligibleDevices.length; i++) {
                if (label == eligibleDevices[i]) {
                    return true;
                }
            }
            return false;
        }
        navigator.mediaDevices.enumerateDevices()
            .then(function (devices) {
            console.log('devices', devices);
            var deviceFound = false;
            for (var i = 0; i < eligibleDevices.length; i++) {
                var regex = new RegExp(eligibleDevices[i], 'ig');
                for (var j = 0; j < devices.length; j++) {
                    if (!deviceFound && devices[j].kind == 'audioinput' && devices[j].label.match(regex)) {
                        _this.deviceId = devices[j].deviceId;
                        deviceFound = true;
                    }
                }
            }
            _this.deviceId = _this.deviceId || 'default';
        });
    };
    AudioConfig.prototype.initializeAudio = function () {
        // var input, analyser, fft;
        var ctx = this.ctx;
        // constraints = {audio: true}
        // this.constraints.audio = {deviceId: {exact: this.deviceId}};
        // navigator.mediaDevices.getUserMedia(this.constraints)
        console.log(ctx);
        navigator.mediaDevices.getUserMedia()
            .then(function (stream) {
            console.log('strea', stream);
            // this.input = ctx.createMediaStreamSource(stream);
            // this.analyser = ctx.createAnalyser();
            // this.analyser.fftSize = this.fftSize;
            // this.analyser.minDecibels = -100;
            // this.analyser.smoothingTimeConstant = 0.0;
            // this.input.connect(this.analyser);
            // setInterval(this.sampleAudio.bind(this), 0);
            // setInterval(this.relaxMaxAmp.bind(this), 100);
        }.bind(this))["catch"](function (error) {
            // debugger
        });
    };
    return AudioConfig;
}());
function init() {
    // set up AudioConfig
    new AudioConfig();
    // set up listener
    // set up sounder
}
init();
