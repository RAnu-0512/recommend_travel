// 六本木を中心に地図描画
const lat_start=34.66640; 
const lng_start=133.919066; 
//34.685028, 133.927567

const mymap = L.map('mapid', {
    center: [lat_start, lng_start],
    zoom: 16,
  }); 

// OpenStreetMap から地図画像を読み込む
const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
});
tileLayer.addTo(mymap);
  

function onMapClick(e){
  //クリック位置経緯度取得
  let lat = e.latlng.lat;
  let lng = e.latlng.lng;
  // マーカー画像の場所を指定する
  L.marker([lat, lng]).addTo(mymap).bindPopup("選択された位置").openPopup(); 
  console.log(lat,lng)
  // JavaScriptからPythonにデータを送信
  fetch('/send_latlng', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ lat, lng })
  })  
  .then((res) => {
    if (!res.ok) {
      throw new Error("fetchに失敗しました");
    }
    return res.json()
  })
  .then(data => {
    console.log(data); // Pythonからの応答を表示
  });
}

mymap.on('click', onMapClick)
