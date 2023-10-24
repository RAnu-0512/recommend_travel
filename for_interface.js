// 六本木を中心に地図描画

var map = L.map('mapid', {
    center: [34.685028, 133.927567],
    zoom: 17,
  }); 
  
  // OpenStreetMap から地図画像を読み込む
  
  var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
  });
  tileLayer.addTo(map);
  
  // マーカー画像の場所を指定する
  
  L.marker([34.685028, 133.927567]).addTo(map); 