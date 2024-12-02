Module.register("MMM-Presenze", {

    _qrCode: null,
    _nunjucks: null,

    _bufferKeys: null,
    _timer: null,

    _badgeHistory: [],
    _sending: false,

    defaults: {

    },

    getStyles() {
        return [
            this.file('css/style.css')
        ]
    },

    start() {
        this._bufferKeys = []

        this._nunjucks = nunjucks.configure({
            autoescape: true
        })

        this._qrCode = TCQrcode.encodeAsBase64({
            text: this.config.qrUrl,
            width: 350,
            height: 350,
            typeNumber: 4,
            colorDark: "#0f0f0f",
            colorLight: "#00ff00",
            correctLevel: 0
        })

        _self = this

        window.addEventListener('keydown', function (e) {

            const isNumber = /^[0-9]$/i.test(e.key)

            if (!isNumber) {
                _self._bufferKeys = []
                clearTimeout(_self._timer)
                return
            }

            clearTimeout(_self._timer)
            _self._timer = setTimeout(function () {
                clearTimeout(_self.timer)
                _self._bufferKeys = []
            }, 3000)

            _self._bufferKeys.push(e.key)

            if (_self._bufferKeys.length === 10) {
                const badge = _self._bufferKeys.join('')
                _self._bufferKeys = []

                _self.sendBadge(badge)
            }
        })
    },

    sendBadge(badge) {

        if (this._sending) {
            return
        }

        this._sending = true

        this._badgeHistory.unshift({
            badge: badge,
            name: null,
            dateTime: new Date(),
            status: null
        })

        if (this._badgeHistory.length > 3) {
            this._badgeHistory.pop()
        }

        this.updateDom()

        _self = this
        fetch(_self.config.actionUrl, {
            method: "POST",
            redirect: 'follow',
            body: JSON.stringify({
                badge: this._badgeHistory[0].badge,
                dateTime: this._badgeHistory[0].dateTime.toISOString()
            }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        })
            .then((res) => res.json())
            .then((res) => {

                if(!res.success) {
                    _self._badgeHistory[0].status = false
                    return
                }

                _self._badgeHistory[0].name = res.name
                _self._badgeHistory[0].status = true
            })
            .catch((err) => {
                console.error(err)
                _self._badgeHistory[0].status = false
            })
            .finally(() => {
                _self._sending = false
                _self.updateDom()
            })
    },

    getDom() {
        const wrapper = document.createElement("div")

        wrapper.innerHTML = this._nunjucks.render(this.file('templates/module.njk'), {
            qrCode: this._qrCode,
            badges: this._badgeHistory
        })

        return wrapper
    },

    getScripts() {
        return [
            'https://cdn.jsdelivr.net/npm/tc-qrcode/tc-qrcode.min.js',
            'https://mozilla.github.io/nunjucks/files/nunjucks.min.js'
        ]
    }
})