var dataLength;
var peaks;
var duration;

//ha nem pontos, akkor ezt lehet állítani
const treeshold = 0.85;
//peakek sűrűsége (minél kisebb annál sűrűbb)
const grouping = 0.0001;


//1920px kijelző ajánlott


window.onload = function () {
    for (i = 0; i < 400; i++) {
        document.getElementById("tableTR").insertCell(i);
    }
    document.getElementById("upload").addEventListener("change", handleFiles, false);
    document.getElementById("audio").addEventListener("timeupdate", updateBar, false);
}

function updateBar() {
    currentTime = document.getElementById("audio").currentTime;
    duration = document.getElementById("audio").duration;
    var elem = document.getElementById("myBar");
    elem.style.width = ((currentTime / duration) * 100) + "%";
}

function handleFiles(e) {
    file = e.target.files[0];
    $("#src").attr("src", URL.createObjectURL(file));


    var reader = new FileReader();
    var context = new (window.AudioContext || window.webkitAudioContext)();
    reader.onload = function () {
        context.decodeAudioData(reader.result, function (buffer) {
            prepare(buffer);
        });
    };
    reader.readAsArrayBuffer(file);
}

function prepare(buffer) {
    var offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    var source = offlineContext.createBufferSource();
    source.buffer = buffer;
    var filter = offlineContext.createBiquadFilter();
    filter.type = "lowpass";
    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start(0);
    offlineContext.startRendering();
    offlineContext.oncomplete = function (e) {
        process(e);
    };
}

function process(e) {
    var filteredBuffer = e.renderedBuffer;
    var data = filteredBuffer.getChannelData(0);
    dataLength = data.length;
    var max = arrayMax(data);
    var min = arrayMin(data);
    var threshold = min + (max - min) * treeshold;
    peaks = getPeaksAtThreshold(data, threshold);
    var intervalCounts = countIntervalsBetweenNearbyPeaks(peaks);
    var tempoCounts = groupNeighborsByTempo(intervalCounts);
    tempoCounts.sort(function (a, b) {
        return b.count - a.count;
    });
    if (tempoCounts.length) {
        document.getElementById("output").innerHTML = tempoCounts[0].tempo + " bpm";
    }
    calculatePeaks();
    document.getElementById("audio").load();
    document.getElementById("audio").play();

}

function calculatePeaks() {
    peaksNormalized = [];
    peaks.forEach(element => {
        peaksNormalized.push((element / dataLength));
    });
    document.getElementById("tableTR").cells[Math.floor(400 * (peaksNormalized[0]))].style.backgroundColor = "red";
    for(i=1; i<peaksNormalized.length; i++){
        console.log(i+"= "+(peaksNormalized[i])+">="+(peaksNormalized[i-1]+grouping)+" ?");
        if (peaksNormalized[i]>=(peaksNormalized[i-1]+grouping)){
            document.getElementById("tableTR").cells[Math.floor(400 * (peaksNormalized[i]))].style.backgroundColor = "red";
        }
    }


}

function getPeaksAtThreshold(data, threshold) {
    var peaksArray = [];
    var length = data.length;
    for (var i = 0; i < length;) {
        if (data[i] > threshold) {
            peaksArray.push(i);
            i += 100;
        }
        i++;
    }
    return peaksArray;
}

function countIntervalsBetweenNearbyPeaks(peaks) {
    var intervalCounts = [];
    peaks.forEach(function (peak, index) {
        for (var i = 0; i < 10; i++) {
            var interval = peaks[index + i] - peak;
            var foundInterval = intervalCounts.some(function (intervalCount) {
                if (intervalCount.interval === interval) return intervalCount.count++;
            });
            if (!isNaN(interval) && interval !== 0 && !foundInterval) {
                intervalCounts.push({
                    interval: interval,
                    count: 1
                });
            }
        }
    });
    return intervalCounts;
}

function groupNeighborsByTempo(intervalCounts) {
    var tempoCounts = [];
    intervalCounts.forEach(function (intervalCount) {
        var theoreticalTempo = 60 / (intervalCount.interval / 44100);
        theoreticalTempo = Math.round(theoreticalTempo);
        if (theoreticalTempo === 0) {
            return;
        }
        while (theoreticalTempo < 90) theoreticalTempo *= 2;
        while (theoreticalTempo > 180) theoreticalTempo /= 2;

        var foundTempo = tempoCounts.some(function (tempoCount) {
            if (tempoCount.tempo === theoreticalTempo) return tempoCount.count += intervalCount.count;
        });
        if (!foundTempo) {
            tempoCounts.push({
                tempo: theoreticalTempo,
                count: intervalCount.count
            });
        }
    });
    return tempoCounts;
}

function arrayMin(arr) {
    var len = arr.length,
        min = Infinity;
    while (len--) {
        if (arr[len] < min) {
            min = arr[len];
        }
    }
    return min;
}

function arrayMax(arr) {
    var len = arr.length,
        max = -Infinity;
    while (len--) {
        if (arr[len] > max) {
            max = arr[len];
        }
    }
    return max;
}
