
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
    // aspects中にsimilarAspectsが含まれていればaspectsを赤く表示
    function highlightSimilarAspects(aspects, similarAspects) {
        // 含まれている場合は強調表示するスタイルを追加
        const highlightedAspects = aspects.map(aspect => {
            return similarAspects.includes(aspect) ? '<b><span style="color: red;">' + aspect + '</span></b>' : aspect;
        });

        // 強調表示した結果を返す
        return highlightedAspects;
    }
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
    function findCircleInMap(mymap) {
        let foundCircle = null;
    
        mymap.eachLayer(function (layer) {
            // サークルかどうかを確認
            if (layer instanceof L.Circle) {
                // ここで特定の条件などを使用してサークルを判定
                // 例: サークルの半径が一定の範囲内かどうかなど
    
                // 条件に合致する場合、foundCircleに格納
                foundCircle = layer;
            }
        });
    
        return foundCircle;
    }

    //クリック位置経緯度取得
    const cliked_lat = e.latlng.lat;
    const cliked_lng = e.latlng.lng;
    let circle = findCircleInMap(mymap)
    if(circle){
        circle.remove();
    }
    clearRecommendInfo();
    clearPopups();
    // 場所を指定する(緑色)
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
            console.log("推薦された全スポット情報", data);
            data.forEach((element, index) => {
                console.log("スポットの情報", element)
                var similarAspects = element.similar_aspects
                var spotAspectPopup = "<b>[" + (index + 1) + "]" + element.spot_name + "</b><br>" + highlightSimilarAspects(element.aspects, similarAspects).join(",");

                const popupId = "popup_" + index;
                const marker = L.marker([element.lat, element.lng]).addTo(mymap).bindPopup(spotAspectPopup, { className: 'custom_popup', id: popupId });
                popups.push(marker)

                const recommendSpotInfo = document.getElementById("recommend_spot_info");
                const popupInfo = document.createElement("div");
                popupInfo.innerHTML = spotAspectPopup;
                popupInfo.dataset.popupId = popupId; // 表示するスポット情報に，マップのポップアップIDを設定
                recommendSpotInfo.appendChild(popupInfo);

                //map中のピンがクリックされた時のイベント追加
                marker.on("popupopen", () => {
                    console.log("popup opened!")
                    //console.log(recommendSpotInfo.querySelector('[data-popup-id="' + marker._popup.options.id + '"]'))
                })
                marker.on('popupclose', () => {
                    // ポップアップが閉じられたときの処理
                    console.log('Popup closed!');
                    //console.log(recommendSpotInfo.querySelector('[data-popup-id="' + marker._popup.options.id + '"]'))
                });
                // スポット情報がクリックされたときのイベント追加
                popupInfo.addEventListener("click", () => {
                    if (popupInfo.classList.contains("highlighted")) {
                        popups.forEach(marker => {
                            marker.closePopup(); // ポップアップを閉じる
                        });
                        recommendSpotInfo.querySelectorAll("#recommend_spot_info div").forEach(element => {
                            element.classList.value = "";
                        });
                    }
                    else {
                        const findMarker = popups.find(marker => marker._popup.options.id === popupId);
                        // 対応するポップアップに移動
                        if (findMarker) {
                            mymap.panTo(findMarker.getLatLng());
                            findMarker.openPopup();
                        }

                        // recommend_spot_info内の全ての要素から強調表示を削除
                        recommendSpotInfo.querySelectorAll(".highlighted").forEach(element => {
                            element.classList.remove("highlighted");
                            element.classList.remove("unhighlighted");
                        });

                        // クリックされたポップアップの情報を強調表示
                        popupInfo.classList.remove("unhighlighted");
                        popupInfo.classList.add("highlighted");


                        var AllSpotsAspectsInfo = recommendSpotInfo.getElementsByTagName("div");
                        // <div> 要素に対して処理を実行
                        for (var i = 0; i < AllSpotsAspectsInfo.length; i++) {
                            var divElement = AllSpotsAspectsInfo[i];

                            // highlighted クラスが付与されていない場合に unhighlighted クラスを追加
                            if (!divElement.classList.contains("highlighted")) {
                                divElement.classList.add("unhighlighted");
                            }
                        }
                    }

                });

            });
            // マップ上の中心座標（例：東京タワーの座標）
            const centerCoordinates = [cliked_lat, cliked_lng];
            // 半径50kmの円を描画
            const distance = document.getElementById('distance_bar').value;
            const circle = L.circle(centerCoordinates, {
                radius: distance * 1000, // 半径50km
                color: 'rgba(255, 0, 0, 0.3)',
                fillColor: 'rgba(255, 0, 0, 0.1)', // 赤色で透明度0.2
                fillOpacity: 0.5
            }).addTo(mymap);

            // 地図を指定された半径の範囲にズームアップ
            mymap.fitBounds(circle.getBounds());
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