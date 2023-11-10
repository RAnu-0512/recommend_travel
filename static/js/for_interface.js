// 岡山駅を中心に地図描画
const lat_start = 34.66640;
const lng_start = 133.919066;

recommend_mode = "setting_parameters"
// recommend_mode = "setting_parameters, select_spot , end_spot"

const greenIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const mymap = L.map('mapid', {
    center: [lat_start, lng_start],
    zoom: 14.5,
});

// OpenStreetMap から地図画像を読み込む
const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
});
tileLayer.addTo(mymap);

function onMapClick(e) {
    //クリック位置経緯度取得
    const cliked_lat = e.latlng.lat;
    const cliked_lng = e.latlng.lng;
    // マーカー画像の場所を指定する
    L.marker([cliked_lat, cliked_lng], { icon: greenIcon }).addTo(mymap).bindPopup("選択された位置").openPopup();
    console.log("cliked : ",cliked_lat, cliked_lng)
    mymap.off('click', onMapClick);
    // JavaScriptからPythonにデータを送信
    fetch('/send_latlng', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cliked_lat, cliked_lng })
    })
        .then((res) => {
            if (!res.ok) {
                throw new Error("fetchに失敗しました");
            }
            return res.json()
        })
        .then(data => {
            console.log(data); // 最も近いスポット
            L.marker([data.lat, data.lng]).addTo(mymap).bindPopup(data.spot_name).openPopup();
            recommend_mode = "end_spot"
        })
        .catch(error => {
            console.error('エラー:', error);
        });
}


range_bar();
get_keyword();
(async () => {
    try {
        await send_checkbox_results();
        if (recommend_mode == "select_spot") {
            mymap.on('click', onMapClick);
        }
    }catch(error){
        console.error("エラー",error);
    }
})();
