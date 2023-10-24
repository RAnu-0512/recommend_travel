// 六本木を中心に地図描画
var lat0=34.66640; 
var lng0=133.919066; 
//34.685028, 133.927567

var mymap = L.map('mapid', {
    center: [lat0, lng0],
    zoom: 16,
  }); 

// OpenStreetMap から地図画像を読み込む
var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
});
tileLayer.addTo(mymap);
  

function onMapClick(e){
  //クリック位置経緯度取得
  lat = e.latlng.lat;
  lng = e.latlng.lng;
  
  // マーカー画像の場所を指定する
  L.marker([lat, lng]).addTo(mymap).bindPopup("開始位置").openPopup(); 
}
mymap.on('click', onMapClick)

