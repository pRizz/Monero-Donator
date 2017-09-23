/**
 * Created by Peter Ryszkiewicz (https://github.com/pRizz) on 9/19/2017.
 * https://github.com/pRizz/Monero-Donator
 */

let currentPublicCoinHiveKey = config.publicCoinHiveKey

const maxThreads = navigator.hardwareConcurrency || 1 // hardwareConcurrency not available on iOS
let currentThreadCount = maxThreads == 1 ? 1 : maxThreads - 1 // leave 1 thread to be nice to the client

const minSpeed = 1
const maxSpeed = 100
let currentSpeed = 90 // be nice to the client

let customJumbotronTitle = null
let customJumbotronSubtitle = null

parseURL()
const miner = new CoinHive.Anonymous(currentPublicCoinHiveKey)
miner.setNumThreads(currentThreadCount)

let foundHashes = 0

function parseURL() {
    const searchParams = new URLSearchParams(document.location.search)
    if(searchParams.get('jumbotronTitle')) { customJumbotronTitle = decodeURIComponent(searchParams.get('jumbotronTitle')) }
    if(searchParams.get('jumbotronSubtitle')) { customJumbotronSubtitle = decodeURIComponent(searchParams.get('jumbotronSubtitle')) }
    if(searchParams.get('coinhivePublicSiteKey')) { currentPublicCoinHiveKey = decodeURIComponent(searchParams.get('coinhivePublicSiteKey')) }
}

function millisecondsToHHMMSSms(milliseconds) {
    let sec_num = parseInt(`${milliseconds / 1000}`, 10); // don't forget the second param
    let hours   = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);
    let millisecondsNum = milliseconds % 1000

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    if (millisecondsNum < 10) {
        millisecondsNum = `00${millisecondsNum}`
    } else if (millisecondsNum < 100) {
        millisecondsNum = `0${millisecondsNum}`
    }
    return `${hours}:${minutes}:${seconds}:${millisecondsNum}`
}

function incrementThreadCount(byValue) {
    currentThreadCount += byValue
    currentThreadCount = currentThreadCount < 1 ? 1 : currentThreadCount > maxThreads ? maxThreads : currentThreadCount
    miner.setNumThreads(currentThreadCount)
    $('#threadCount').text(currentThreadCount)
}

function getCurrentThrottle() {
    return (maxSpeed - currentSpeed) / 100
}

function incrementSpeed(byValue) {
    currentSpeed += byValue
    currentSpeed = currentSpeed >= maxSpeed ? maxSpeed : currentSpeed <= minSpeed ? minSpeed : currentSpeed
    miner.setThrottle(getCurrentThrottle())
    setSpeedText()
}

function setSpeedText() {
    $('#speedCount').text(`${currentSpeed}%`)
}

function toggleNightMode() {
    $("body").toggleClass('night-mode')
    $("pre").toggleClass('night-mode')
    $(".panel").toggleClass('night-mode')
    $("img").toggleClass('inverted-image')
}

$(function(){

    const $jumbotronTitleInput = $('#jumbotronTitleInput')
    const $jumbotronSubtitleInput = $('#jumbotronSubtitleInput')
    const $coinhivePublicSiteKeyInput = $('#coinhivePublicSiteKeyInput')

    if(customJumbotronTitle) { $('#jumbotronTitle').html(customJumbotronTitle) }
    if(customJumbotronSubtitle) { $('#jumbotronSubtitle').html(customJumbotronSubtitle) }

    $('.jumbotron').animate({opacity: 1.0}, 800)

    $('#threadCount').text(currentThreadCount)
    setSpeedText()

    const startMilliseconds = Date.now()

    function durationInMinutes() {
        return durationInSeconds() / 60
    }

    function durationInSeconds() {
        return durationInMilliseconds() / 1000
    }

    function durationInMilliseconds() {
        return Date.now() - startMilliseconds
    }

    function updateTimer() {
        $('#timeSpentMining').text(millisecondsToHHMMSSms(durationInMilliseconds()))
    }

    $jumbotronTitleInput.on('input', () => { updateGeneratedURL() })
    $jumbotronSubtitleInput.on('input', () => { updateGeneratedURL() })
    $coinhivePublicSiteKeyInput.on('input', () => { updateGeneratedURL() })

    function generateURL(jumbotronTitle, jumbotronSubtitle, coinhivePublicSiteKey) {
        const encodedJumbotronTitle = encodeURIComponent(jumbotronTitle)
        const encodedJumbotronSubtitle = encodeURIComponent(jumbotronSubtitle)
        const encodedCoinhivePublicSiteKey= encodeURIComponent(coinhivePublicSiteKey)

        const queryParams = {
            jumbotronTitle: encodedJumbotronTitle,
            jumbotronSubtitle: encodedJumbotronSubtitle,
            coinhivePublicSiteKey: encodedCoinhivePublicSiteKey
        }

        let queryParamsEncoded = Object.entries(queryParams).map((entry) => { return `${entry[0]}=${entry[1]}` }).join('&')
        return `${config.baseURL}?${queryParamsEncoded}`
    }

    function updateGeneratedURL() {
        const generatedURL = generateURL(
            $jumbotronTitleInput.val(),
            $jumbotronSubtitleInput.val(),
            $coinhivePublicSiteKeyInput.val(),
        )

        const generatedWebsiteLinkAnchor = $('#generatedWebsiteLink')[0]
        generatedWebsiteLinkAnchor.href = generatedURL
        generatedWebsiteLinkAnchor.innerText = generatedURL
    }

    miner.on('found', (params) => {
        if(params.error) { return }
        const found = params.hashes
        if(!found) { return }
        foundHashes += found
        $('#foundGoodHashes').text(foundHashes.toLocaleString())
        updateGoodHashRate()
    })

    miner.on('accepted', (params) => {
        if(params.error) { return }
        const accepted = params.hashes
        if(!accepted) { return }
        $('#acceptedGoodHashes').text(accepted.toLocaleString())
    })

    miner.setThrottle(getCurrentThrottle())

    miner.start(CoinHive.FORCE_MULTI_TAB)

    function updateGoodHashRate() {
        $('#goodHashRate').text(((foundHashes / miner.getTotalHashes(true)) || 0).toFixed(6))
    }

    function updateMinerStats() {
        $('#totalHashes').text(miner.getTotalHashes(true).toLocaleString())
        $('#hashesPerSecond').text(miner.getHashesPerSecond().toLocaleString(undefined, {
            maximumFractionDigits: 3
        }))
        updateGoodHashRate()
    }

    setInterval(function(){
        updateTimer()
        updateMinerStats()
    }, 50)
})
