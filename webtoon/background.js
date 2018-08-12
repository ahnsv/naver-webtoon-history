var webtoon = {};
var visits = {};
var wtab = 0
var interval = 0
var lastScroll = 0

function updateStorage() {
    chrome.storage.sync.set({
        'webtoon': webtoon,
        'visits': visits
    }, () => {
        console.log("success")
    })
}

function initWebLog() {
    chrome.history.search({
        text: "detail.nhn?titleId=",
        startTime: 0,
        maxResults: 5000
    }, (data) => {
        // 역시간 순을 위해 배열을 뒤집음
        data.reverse()
        webtoon = {}
        visits = {}
        data.forEach(d => {
            if (!d.title) return;
            var url = new URL(d.url)
            var params = url.searchParams
            let wid = params.get("titleId")
            let wno = params.get("no")
            if (!webtoon[wid]) {
                webtoon[wid] = {}
                visits[wid] = {}
                webtoon[wid].na = d.title.split("::")[0]
                visits[wid][wno] = Math.floor(d.lastVisitTime / 1000)
                webtoon[wid].t = url.pathname.split("/detail.nhn")[0]

            } else {
                visits[wid][wno] = Math.floor(d.lastVisitTime / 1000)
            }
        });
        updateStorage();

    })
}

chrome.storage.sync.get(['webtoon', 'visits'], (result) => {
    if (!result) {
        initWebLog();
    } else {
        console.log("get from chrome storage")
        webtoon = result.webtoon
        visits = result.visits
    }
})

function addScrollEvent() {
    chrome.tabs.executeScript(wtab, {
        file: 'js/scroll.js',
        runAt: 'document_end',
        matchAboutBlank: true
    })
}
chrome.tabs.onUpdated.addListener((tid, ci, tab) => {

    if (ci.status && ci.status == "complete") {

        var url = new URL(tab.url)
        if (url.host === "comic.naver.com") {
            if (url.pathname.indexOf("/list.nhn") > 0) {
                var wid = url.searchParams.get("titleId");
                var vkey = Object.keys(visits[wid])
                if (vkey) {
                    for (var i = 0; i < vkey.length; i++) {
                        chrome.tabs.executeScript(tid, {
                            code: `var wlog=document.querySelector("a[href*='detail.nhn?titleId=${wid}&no=${vkey[i]}']");
                    if (wlog){
                        wlog=wlog.parentElement.parentElement;
                        wlog.style.background="lightgray";
                        wlog.title="${new Date(visits[wid][vkey[i]]*1000).toLocaleString() + '에 봄'}"
                    }`
                        })
                    }
                }
            } else if (url.pathname.indexOf("/detail.nhn") > 0) {
                wtab = tid
                var wid = url.searchParams.get("titleId");
                if (!webtoon[wid]) {
                    webtoon[wid] = {}
                    webtoon[wid].na = tab.title.split("::")[0]
                    webtoon[wid].t = url.pathname.split("/detail.nhn")[0]
                }
                visits[wid][url.searchParams.get("no")] = Math.floor(new Date().getTime() / 1000)

                //    setTimeout(()=>addScrollEvent(tid), 5000)
                addScrollEvent(tid)
                updateStorage();
            }
        }
    }
});


chrome.runtime.onMessageExternal.addListener(
    function (request, sender, cb) {
        var wid = new URL(sender.url).searchParams.get('titleId');
        console.log(`${wid} send ${request}`)
    });