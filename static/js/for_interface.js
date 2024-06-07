
const fix_distance_button = document.getElementById('fix_distance');
const fix_aspect_button = document.getElementById('fix_aspect');

// fix_distance_button.disabled = true;
// fix_aspect_button.disabled = true;

//何県の推薦か
const selected_pref = document.getElementById("selected_pref").innerText;

//leaflet
const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
});

const greenIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

window.onload = function () {
    // フォーム要素を取得
    var form = document.querySelector('form[name="pref_form"]');
    form.action = "/" + document.getElementById('pref_select').value
    // セレクトボックスの変更を監視し、フォームのaction属性を更新
    document.getElementById('pref_select').addEventListener('change', function () {
        form.action = '/' + this.value; // 選択された都道府県に基づいてaction属性を更新
    });
};

function readStartLatLngFile(pref) {
    return new Promise((resolve, rejcet) => {
        fetch("/get_prefLatLng", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pref: pref }),
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("fetchに失敗しました");
                }
                return res.json()
            })
            .then(data => {
                if (data.pref == "Error") {
                    rejcet("Prefecture not found:" + pref);
                }
                else {
                    resolve([data.start_lat, data.start_lng]);
                }

            })
            .catch(error => {
                console.error('緯度経度読み込みエラー:', error);
            });
    });
}

function loadSpotImage(photo_url, noImageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            resolve(photo_url);
        };
        img.onerror = function () {
            resolve(noImageUrl);
        };
        img.src = photo_url;
    });
}

function add_html(index, url, spot_name, outerHTML_text) {
    return "<b>[" + (index + 1) + "] <a href='" + url + "' target='_blank'>" + spot_name + "</a></b><br>" + outerHTML_text;
}

function highlightSimilarAspects(aspects, similarAspects) {
    // 含まれている場合は強調表示するスタイルを追加
    const highlightedAspects = aspects.map(aspect => {
        return similarAspects.includes(aspect) ? '<b><span style="color: red;">' + aspect + '</span></b>' : aspect;
    });

    // 強調表示した結果を返す
    return highlightedAspects;
}
// すべてのポップアップを消す関数
function clearPopups(mymap, popups) {
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
        if (layer instanceof L.Circle) {
            foundCircle = layer;
        }
    });
    return foundCircle;
}


(async () => {
    try {
        function onMapClick(e) {
            const startTime = Date.now(); // 開始時間
            const cliked_lat = e.latlng.lat;
            const cliked_lng = e.latlng.lng;

            //最初に以前の推薦情報を削除する(推薦スポットのピン，情報，推薦範囲円)
            let circle = findCircleInMap(mymap)
            if (circle) {
                circle.remove();
            }
            clearRecommendInfo();
            clearPopups(mymap, popups);

            // 場所を指定する(緑色)
            const selectedPopup = L.marker([cliked_lat, cliked_lng], { icon: greenIcon }).addTo(mymap).bindPopup("~計算中です~<br>少々お待ちください", { className: 'selected_latlng', id: "popup_selected" }).openPopup();
            popups.push(selectedPopup)

            console.log("clicked : ", cliked_lat, cliked_lng)
            mymap.off('click', onMapClick);


            //クリックされたときの選択した観点,推薦範囲を読み取る
            const selectedResults = document.getElementsByClassName('selected_result');
            const selectedResults_Array = Array.from(selectedResults);
            const selectedResultsTextArray = []
            selectedResults_Array.forEach(selectedresults_array_n => {
                selectedResultsTextArray.push(selectedresults_array_n.textContent)
                //console.log(selectedresults_array_n.textContent)
            })

            let lastSelectedValue = distanceBar.value;
            console.log("選択した観点", selectedResultsTextArray);
            console.log("距離", lastSelectedValue);
            console.log("選択地点", cliked_lat, cliked_lng);


            fetch("/get_recommended_spots", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cliked_lat: cliked_lat, cliked_lng: cliked_lng, range: lastSelectedValue, selected_aspects: selectedResultsTextArray, selected_pref: selected_pref })
            })
                .then((res) => {
                    if (!res.ok) {
                        throw new Error("マップクリック:fetchに失敗しました");
                    }
                    return res.json()
                })
                .then(data => {
                    console.log("推薦された全スポット情報", data);

                    data.forEach(async (element, index) => {
                        console.log("スポットの情報", element)
                        const similarAspects = element.similar_aspects
                        const prefecture = selected_pref.replace("都", "").replace("道", "").replace("県", "");
                        const photo_url = "static/images/" + prefecture + "/" + element.spot_name + ".jpg";
                        const noImageUrl = "static/images/NoImage.jpg";
                        const imgElement = document.createElement("img");
                        imgElement.className = "spot_image"
                        try {
                            const popupId = "popup_" + index;
                            const replaced_spot_name = element.spot_name.replace("second", "").replace("third", "");
                            const spotAspectExplain = "<b>[" + (index + 1) + "]" + replaced_spot_name + "</b><br>" + highlightSimilarAspects(element.aspects, similarAspects).join(",");
                            const recommendSpotInfo = document.getElementById("recommend_spot_info");
                            const popupInfo = document.createElement("div");
                            popupInfo.innerHTML = spotAspectExplain;
                            popupInfo.dataset.popupId = popupId; // 表示するスポット情報に，マップのポップアップIDを設定
                            popupInfo.className = "normal_info"
                            recommendSpotInfo.appendChild(popupInfo);

                            imgElement.src = await loadSpotImage(photo_url, noImageUrl);
                            const spotAspectPopup = add_html(index, element.url, replaced_spot_name, imgElement.outerHTML);
                            const marker = L.marker([element.lat, element.lng]).addTo(mymap).bindPopup(spotAspectPopup, { className: 'custom_popup', id: popupId }).openPopup();
                            const tooltip_text = `<b>[${(index + 1)}]${replaced_spot_name}</b>`;
                            marker.bindTooltip(tooltip_text, { permanent: true }).openTooltip();
                            popups.push(marker);
                            marker.closePopup();


                            //map中のピンが上がった場合と下がった場合の処理
                            marker.on("popupopen", () => {
                                recommendSpotInfo.querySelectorAll("#recommend_spot_info div").forEach(element => {
                                    element.classList.value = "unhighlighted_info";
                                });
                                const select_spotinfo = recommendSpotInfo.querySelector('[data-popup-id="' + marker._popup.options.id + '"]')
                                select_spotinfo.classList.value = "highlighted_info"
                                scrollOffsetTop = recommendSpotInfo.scrollTop + recommendSpotInfo.offsetTop
                                scrollOffsetBottom = recommendSpotInfo.scrollTop + recommendSpotInfo.offsetTop + recommendSpotInfo.clientHeight
                                spotOffsetTop = select_spotinfo.offsetTop
                                spotOffsetBottom = select_spotinfo.offsetTop + select_spotinfo.offsetHeight
                                if (spotOffsetBottom > scrollOffsetBottom) {
                                    recommendSpotInfo.scrollTop = spotOffsetTop - recommendSpotInfo.offsetTop - recommendSpotInfo.clientHeight + select_spotinfo.offsetHeight
                                }
                                else if (spotOffsetTop < scrollOffsetTop) {
                                    recommendSpotInfo.scrollTop = spotOffsetTop - recommendSpotInfo.offsetTop;
                                }
                                setTimeout(() => {
                                    mymap.off("click", onMapClick);
                                }, 1);
                            })
                            marker.on('popupclose', () => {
                                recommendSpotInfo.querySelectorAll("#recommend_spot_info div").forEach(element => {
                                    element.classList.value = "normal_info";
                                });
                                setTimeout(() => {
                                    mymap.on("click", onMapClick);
                                }, 1);
                            });
                            // スポット情報がクリックされたときのイベント追加
                            popupInfo.addEventListener("click", () => {
                                if (popupInfo.classList.contains("highlighted_info")) {
                                    popups.forEach(marker => {
                                        marker.closePopup(); // ポップアップを閉じる
                                    });
                                    recommendSpotInfo.querySelectorAll("#recommend_spot_info div").forEach(element => {
                                        element.classList.value = "normal_info";
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
                                    recommendSpotInfo.querySelectorAll(".highlighted_info").forEach(element => {
                                        element.classList.remove("highlighted_info");
                                        element.classList.remove("unhighlighted_info");
                                    });

                                    // クリックされたポップアップの情報を強調表示
                                    popupInfo.classList.remove("unhighlighted_info");
                                    popupInfo.classList.add("highlighted_info");


                                    var AllSpotsAspectsInfo = recommendSpotInfo.getElementsByTagName("div");
                                    // <div> 要素に対して処理を実行
                                    for (var i = 0; i < AllSpotsAspectsInfo.length; i++) {
                                        var divElement = AllSpotsAspectsInfo[i];

                                        // highlighted クラスが付与されていない場合に unhighlighted クラスを追加
                                        if (!divElement.classList.contains("highlighted_info")) {
                                            divElement.classList.add("unhighlighted_info");
                                        }
                                    }
                                }

                            });

                        } catch (error) {
                            console.error("Error loading image:", error.message);
                        }
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

                    mymap.on("click", onMapClick);
                    selectedPopup.bindPopup("選択された位置", { className: 'selected_latlng', id: "popup_selected" }).openPopup();
                    const endTime = Date.now(); // 終了時間
                    console.log("処理にかかった時間 : ",endTime - startTime,"ミリ秒"); // 何ミリ秒かかったかを表示する

                })
                .catch(error => {
                    console.error('マップクリック:エラー:', error);
                });
        }


        [lat_start, lng_start] = await readStartLatLngFile(selected_pref.replace("都", "").replace("道", "").replace("県", ""));
        console.log(selected_pref.replace("都", "").replace("道", "").replace("県", ""), lat_start, lng_start);
        const mymap = L.map('mapid', {
            center: [lat_start, lng_start],
            zoom: 14.5,
        });
        tileLayer.addTo(mymap);
        const popups = []; //ポップアップのリスト
        range_bar_always();
        get_keyword(selected_pref);
        add_selected_aspects();
        mymap.on("click", onMapClick);
    }
    catch (error) {
        console.error("Error loading pref lat and lng :", error.message);
    }
})();

document.getElementById('resetButton').addEventListener('click', function () {
    location.reload();
});


