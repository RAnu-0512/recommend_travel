
const fix_distance_button = document.getElementById('fix_distance')
const fix_aspect_button = document.getElementById('fix_aspect')

fix_distance_button.disabled = true;
fix_aspect_button.disabled = true;

// 岡山駅を中心に地図描画
const lat_start = 34.66640;
const lng_start = 133.919066;

recommend_mode = "select_aspect"
// recommend_mode = "select_aspect, select_distance , select_spot, end_recommend"

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

const popups = []; //ポップアップのリスト
function onMapClick(e) {
    // すべてのポップアップを消す関数
    function clearPopups() {
        popups.forEach(popup => {
            mymap.closePopup(popup);
            mymap.removeLayer(popup);
        });
        popups.length = 0; // 配列をクリア
    }
    // 推薦されたスポット情報を消す関数
    function clearRecommendInfo() {
        var element = document.getElementById("recommend_spot_info");
        element.innerHTML = ""; // 要素内のコンテンツを空にする
    }
    //クリック位置経緯度取得
    const cliked_lat = e.latlng.lat;
    const cliked_lng = e.latlng.lng;
    clearRecommendInfo();
    clearPopups();
    // マーカー画像の場所を指定する
    const selectedPopup = L.marker([cliked_lat, cliked_lng], { icon: greenIcon }).addTo(mymap).bindPopup("選択された位置").openPopup();
    popups.push(selectedPopup)
    console.log("cliked : ", cliked_lat, cliked_lng)
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
            console.log(data);
            data.forEach((element, index) => {
                console.log(element)

                var popupContent = "<b>[" + (index + 1) + "]" + element.spot_name + "</b><br>" + element.aspects.join(",");
                const marker = L.marker([element.lat, element.lng]).addTo(mymap).bindPopup(popupContent).openPopup();
                popups.push(marker)
                const recommendSpotInfo = document.getElementById("recommend_spot_info");
                const popupInfo = document.createElement("div");
                popupInfo.innerHTML = popupContent;
                recommendSpotInfo.appendChild(popupInfo);
                // クリックイベントハンドラを追加
                popupInfo.addEventListener("click", () => {
                    // 対応するポップアップに移動
                    mymap.panTo([element.lat, element.lng]);
                    marker.openPopup();
                });
            });
            recommend_mode = "end_recommend"
        })
        .catch(error => {
            console.error('エラー:', error);
        });
}




range_bar_always();
get_keyword();
add_selected_aspects();
(async () => {
    try {
        await send_selected_aspects();
        await range_bar();
        if (recommend_mode == "select_spot") {
            mymap.on('click', onMapClick);
        }
    } catch (error) {
        console.error("エラー", error);
    }
})();


// fix_distanceをクリックしたときの処理
document.getElementById('fix_distance').addEventListener('click', async function () {
    try {
        recommend_mode = "select_distance"
        const distanceBar = document.getElementById('distance_bar');
        const distance_decide_button = document.getElementById('distance_decide_button');
        if (distanceBar.disabled == true | distance_decide_button.disabled == true) {
            distanceBar.disabled = false;
            distance_decide_button.disabled = false;
            fix_aspect_button.disabled = true;
            await range_bar();
            fix_aspect_button.disabled = false;
            if (recommend_mode == "select_spot") {
                mymap.on('click', onMapClick);
            }
        } else {
            console.log("距離修正ボタンはまだ押せません");
        }
    } catch (error) {
        console.error("エラー", error);
    }
});


// fix_aspectをクリックしたときの処理
document.getElementById('fix_aspect').addEventListener('click', async function () {
    function removeItem(element) {
        const parent = element.parentNode;
        parent.removeChild(element);
    }
    try {
        recommend_mode = "select_aspect"
        const DecideButton = document.getElementById("decide_button")
        const checkboxes = document.querySelectorAll('input[type=checkbox]');
        const AddButton = document.getElementById("add_selected_aspects");
        const SearchForm = document.getElementById("search_form")
        const SearchButton = document.getElementById("submit_query");
        const removebuttons = document.querySelectorAll(".remove_button");
        const distanceBar = document.getElementById('distance_bar');
        if (AddButton.disabled == true | DecideButton.disabled == true | SearchButton.disabled == true | SearchForm.disabled == true) {
            // 各 remove_button 要素に対してクリックイベントリスナーを追加
            removebuttons.forEach(removeButton => {
                removeButton.onclick = function () {
                    const parentElement = this.parentNode;
                    removeItem(parentElement);
                };
            });
            checkboxes.forEach(checkbox => {
                checkbox.disabled = false;
            })
            AddButton.disabled = false;
            DecideButton.disabled = false;
            SearchButton.disabled = false;
            SearchForm.disabled = false;
            fix_distance_button.disabled = true;
            await send_selected_aspects();
            fix_distance_button.disabled = false;
            if (recommend_mode === "select_distance" & distanceBar.disabled == true) {
                mymap.on('click', onMapClick);
            }
        } else {
            console.log("観点修正ボタンはまだ押せません");
        }
    } catch (error) {
        console.error("エラー", error);
    }
});