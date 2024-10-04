
const fix_distance_button = document.getElementById('fix_distance');
const fix_aspect_button = document.getElementById('fix_aspect');

// fix_distance_button.disabled = true;
// fix_aspect_button.disabled = true;

//何県の推薦か
const selected_pref = document.getElementById("selected_pref").innerText;
// const selected_pref = "岡山県"
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
        return similarAspects.includes(aspect) ? `<b class="aspect" style="color: red;">${aspect}</b>` : `<b class="aspect">${aspect}</b>`;
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

//感情極性値の星評価変換 1.0 --> 5.0  , 0.0 --> 2.5 , -1.0 --> 0.0
function senti2StarsEval(senti_socre) {
    senti_socre = Math.max(-1.0, Math.min(1.0, senti_socre));
    const stars = Math.round((senti_socre + 1) * 2.5 * 10) / 10;
    return stars.toFixed(1);
}



(async () => {
    try {
        // 推薦情報を受け取り、displayに表示する
        function display_recommend_spot(lat, lng) {
            const selectedStyle = document.getElementById('selected_style').textContent;
            const selectedSpotsHTML = document.getElementById('selected_spot_level2').innerHTML;
            const startTime = Date.now(); // 開始時間
            //最初に以前の推薦情報を削除する(推薦スポットのピン，情報，推薦範囲円)
            let circle = findCircleInMap(mymap)
            if (circle) {
                circle.remove();
            }
            clearRecommendInfo();
            clearPopups(mymap, popups);

            // 場所を指定する(緑色)
            const selectedPopup = L.marker([lat, lng], { icon: greenIcon }).addTo(mymap).bindPopup("~計算中です~<br>少々お待ちください", { className: 'selected_latlng', id: "popup_selected" }).openPopup();
            popups.push(selectedPopup)

            console.log("clicked : ", lat, lng)
            mymap.off('click', onMapClick);


            //クリックされたときの選択した観点,推薦範囲を読み取る
            const selectedResults = document.getElementsByClassName('selected_result');
            const selectedResults_Array = Array.from(selectedResults);
            const selectedResultsTextArray = []
            selectedResults_Array.forEach(selectedresults_array_n => {
                selectedResultsTextArray.push(selectedresults_array_n.textContent)
                //console.log(selectedresults_array_n.textContent)
            })
            const selectedSpots = selectedSpotsHTML.split("<br>");
            let lastSelectedValue = distanceBar.value;
            console.log("選択した推薦スタイル:", selectedStyle)
            console.log("選択したスポット:",selectedSpots)
            console.log("選択した観点", selectedResultsTextArray);
            console.log("距離", lastSelectedValue);
            console.log("選択地点", lat, lng);
            

            fetch("/get_recommended_spots", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ clicked_lat: lat, clicked_lng: lng, range: lastSelectedValue, selected_aspects: selectedResultsTextArray, selected_pref: selected_pref, selected_style: selectedStyle,selectedSpots:selectedSpots})
            })
                .then((res) => {
                    if (!res.ok) {
                        throw new Error("マップクリック:fetchに失敗しました");
                    }
                    return res.json()
                })
                .then(data => {
                    console.log("推薦された全スポット情報", data);
                    //dataは{"spot_name":str,"lat":float,"lng":float,"aspects":{aspect:{"senti_score":float,"count":float}},
                    //      "similar_aspects":{aspect:{"senti_score":float,"count":float}},"score" :float,"url":str}
                    data.forEach(async (element, index) => {
                        console.log("スポットの情報", element)
                        function aspectsAddEvaluation(aspects){
                            const sortedAspects = Object.entries(aspects)
                            .sort((a, b) => {
                                const scoreA = senti2StarsEval(a[1].senti_score);
                                const scoreB = senti2StarsEval(b[1].senti_score);
                                return scoreB - scoreA; // 降順にソート
                            });
                        const aspectsHtml = sortedAspects
                            .map(([aspect, data]) =>
                                `<span class = "aspect-plus-rating">
                                    <span class = "aspect">${aspect}</span>
                                    <span class = "aspect-rating"> 
                                        <span class = "rating-num">${senti2StarsEval(data.senti_score)} </span>
                                        <span class = "star-ratings">
                                            <span class="star-ratings-top" style="width: calc(20% * ${senti2StarsEval(data.senti_score)});"> ★★★★★ </span>
                                            <span class = "star-ratings-bottom"> ★★★★★ </span>
                                        </span>
                                    </span>
                                </span>`)
                            .join("");
                            return aspectsHtml
                        }
                        const similarAspects = aspectsAddEvaluation(element.similar_aspects)
                        const prefecture = selected_pref.replace("都", "").replace("道", "").replace("県", "");
                        const photo_url = "static/images/" + prefecture + "/" + element.spot_name + ".jpg";
                        const noImageUrl = "static/images/NoImage.jpg";
                        const imgElement = document.createElement("img");
                        imgElement.className = "spot_image"
                        try {
                            const popupId = "popup_" + index;
                            const replaced_spot_name = element.spot_name.replace("second", "").replace("third", "");
                            const spotAspectExplain = `
                                                        <span class="spot-info-container">
                                                            <span class="spot-info-name">
                                                            <b>[${index + 1}] ${replaced_spot_name}</b>
                                                            </span>
                                                            <button class="spotinfo_detailButton" data-popup-id="${popupId}">詳細を見る</button>
                                                            <span class="spot-aspects">
                                                            ${similarAspects}
                                                            </span>
                                                        </span>
                                                    `;
                            const recommendSpotInfo = document.getElementById("recommend_spot_info");

                            // ポップアップ情報の作成
                            const popupInfo = document.createElement("div");
                            popupInfo.innerHTML = spotAspectExplain;
                            popupInfo.dataset.popupId = popupId; // マップのポップアップIDを設定
                            popupInfo.className = "normal_info";

                            // スポット情報リストに追加
                            recommendSpotInfo.appendChild(popupInfo);

                            // 「詳細を見る」ボタンのクリックイベントを設定
                            const spotinfo_detailButton = popupInfo.querySelector(".spotinfo_detailButton");
                            spotinfo_detailButton.addEventListener("click", (event) => {
                                event.stopPropagation(); // 親要素のクリックイベントを防ぐ
                                const modal = document.getElementById("spotinfo_modal");
                                const modalBody = document.getElementById("spot-modal-content");

                                // モーダルの内容を設定（必要に応じて詳細情報を追加）
                                modalBody.innerHTML = `
                                    <h2>${replaced_spot_name} の詳細</h2>
                                    <p>URL: <a href="${element.url}" target="_blank">${element.url}</a></p>
                                    <img src="${photo_url}" alt="${replaced_spot_name}" style="max-width: 100%; height: auto;">
                                    <p>${aspectsAddEvaluation(element.aspects)}</p>
                                `;

                                // モーダルを表示
                                modal.style.display = "block";
                            });

                            // 画像の読み込み
                            imgElement.src = await loadSpotImage(photo_url, noImageUrl);

                            // ポップアップHTMLの作成
                            const spotAspectPopup = add_html(index, element.url, replaced_spot_name, imgElement.outerHTML);

                            // マーカーの作成と設定
                            const marker = L.marker([element.lat, element.lng])
                                .addTo(mymap)
                                .bindPopup(spotAspectPopup, { className: 'custom_popup', id: popupId })
                                .openPopup();

                            // ツールチップの設定
                            const tooltip_text = `<b>[${index + 1}]${replaced_spot_name}</b>`;
                            marker.bindTooltip(tooltip_text, { permanent: true }).openTooltip();

                            // マーカーをポップアップ配列に追加
                            popups.push(marker);
                            marker.closePopup();

                            // ポップアップのイベント設定
                            marker.on("popupopen", () => {
                                recommendSpotInfo.querySelectorAll("#recommend_spot_info div").forEach(element => {
                                    element.classList.value = "unhighlighted_info";
                                });
                                const select_spotinfo = recommendSpotInfo.querySelector(`[data-popup-id="${marker._popup.options.id}"]`);
                                select_spotinfo.classList.value = "highlighted_info";

                                const scrollOffsetTop = recommendSpotInfo.scrollTop + recommendSpotInfo.offsetTop;
                                const scrollOffsetBottom = recommendSpotInfo.scrollTop + recommendSpotInfo.offsetTop + recommendSpotInfo.clientHeight;
                                const spotOffsetTop = select_spotinfo.offsetTop;
                                const spotOffsetBottom = select_spotinfo.offsetTop + select_spotinfo.offsetHeight;

                                if (spotOffsetBottom > scrollOffsetBottom) {
                                    recommendSpotInfo.scrollTop = spotOffsetTop - recommendSpotInfo.offsetTop - recommendSpotInfo.clientHeight + select_spotinfo.offsetHeight;
                                } else if (spotOffsetTop < scrollOffsetTop) {
                                    recommendSpotInfo.scrollTop = spotOffsetTop - recommendSpotInfo.offsetTop;
                                }

                                setTimeout(() => {
                                    mymap.off("click", onMapClick);
                                }, 1);
                            });

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
                                } else {
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

                                    const AllSpotsAspectsInfo = recommendSpotInfo.getElementsByTagName("div");
                                    // <div> 要素に対して処理を実行
                                    for (let i = 0; i < AllSpotsAspectsInfo.length; i++) {
                                        const divElement = AllSpotsAspectsInfo[i];

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
                    const centerCoordinates = [lat, lng];
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
                    console.log("処理にかかった時間 : ", endTime - startTime, "ミリ秒"); // 何ミリ秒かかったかを表示する

                })
                .catch(error => {
                    console.error('マップクリック:エラー:', error);
                });
        }
        function onMapClick(e) {
            const clicked_lat = e.latlng.lat;
            const clicked_lng = e.latlng.lng;
            display_recommend_spot(clicked_lat, clicked_lng)
        }
        function onReRecommendButtonClick() {
            if (popups[0] != undefined) {
                const cur_lat = popups[0]._latlng.lat;
                const cur_lng = popups[0]._latlng.lng;
                display_recommend_spot(cur_lat, cur_lng)
            }
            else {
                alert("観光予定の中心地をマップをクリックして選択してください！")
            }
        }
        function onStyleSelectButtonClick(lat_start, lng_start) {
            if (popups[0] != undefined) {
                const cur_lat = popups[0]._latlng.lat;
                const cur_lng = popups[0]._latlng.lng;
                display_recommend_spot(cur_lat, cur_lng)
            }
            else {
                display_recommend_spot(lat_start, lng_start)
            }
        }
        [lat_start, lng_start] = await readStartLatLngFile(selected_pref.replace("都", "").replace("道", "").replace("県", ""));
        console.log(selected_pref.replace("都", "").replace("道", "").replace("県", ""), lat_start, lng_start);
        const mymap = L.map('mapid', {
            center: [lat_start, lng_start],
            zoomControl: false,
            zoom: 14.5,
        });
        L.control.zoom({
            position: 'topright' // 右上にズームコントロールを表示
        }).addTo(mymap);
        tileLayer.addTo(mymap);
        const popups = []; //ポップアップのリスト
        range_bar_always();
        get_keyword(selected_pref);
        add_selected_aspects();
        // DOMが完全に読み込まれた後にイベントリスナーを設定
        const rerecommend_button = document.getElementById('rerecommend_button_parm');
        if (rerecommend_button) {
            rerecommend_button.addEventListener('click', onReRecommendButtonClick);
        }
        const submit_selection_button = document.getElementById("submit_selection_button");
        if (submit_selection_button) {
            submit_selection_button.addEventListener('click', () => {
                onStyleSelectButtonClick(lat_start, lng_start)
            }
            );
        }
        const modal2_complete_button = document.getElementById("complete_button");
        if (modal2_complete_button) {
            modal2_complete_button.addEventListener('click', () => {
                onStyleSelectButtonClick(lat_start, lng_start)
            }
            );
        }
        mymap.on("click", onMapClick);

    }
    catch (error) {
        console.error("Error loading pref lat and lng :", error.message);
    }
})();

document.getElementById('resetButton').addEventListener('click', function () {
    location.reload();
});

//検索ボックス
document.getElementById("close_button_parm").addEventListener("click", function () {
    if (document.getElementById("recommend_style_box").style.display == "none") {
        document.getElementById("open_button_recom").style.top = "100px";
    }
    else {
        document.getElementById("recommend_style_box").style.top = "100px";
    }
    document.getElementById("parameters").style.display = "none";
    document.getElementById("open_button_parm").style.display = "";
});

document.getElementById("open_button_parm").addEventListener("click", function () {
    if (document.getElementById("recommend_style_box").style.display == "none") {
        document.getElementById("open_button_recom").style.top = "230px";
    }
    else {
        document.getElementById("recommend_style_box").style.top = "230px";
    }
    document.getElementById("parameters").style.display = "";
    document.getElementById("open_button_parm").style.display = "none";
});

//推薦プランの選択ボックス
document.getElementById("close_button_recom").addEventListener("click", function () {
    if (document.getElementById("parameters").style.display == "none") {
        document.getElementById("open_button_recom").style.top = "100px";
    }
    else {
        document.getElementById("open_button_recom").style.top = "230px";
    }
    document.getElementById("recommend_style_box").style.display = "none";
    document.getElementById("open_button_recom").style.display = "";
});

document.getElementById("open_button_recom").addEventListener("click", function () {
    if (document.getElementById("parameters").style.display == "none") {
        document.getElementById("recommend_style_box").style.top = "100px";
    }
    else {
        document.getElementById("recommend_style_box").style.top = "230px"
    }
    document.getElementById("recommend_style_box").style.display = "";
    document.getElementById("open_button_recom").style.display = "none";
});











// ----------------推薦スタイルボックスを表示するコード(modal1)
const modal_level1 = document.getElementById('modal_level1');
const openButton = document.getElementById('modal_level1_openButton');
const modal1_closeButton = document.getElementById('modal_level1_closeButton');
const cards = document.querySelectorAll('.card');
const travelStyleContainer = document.getElementById('travelStyleContainer');
const selectedStyle = document.getElementById('selected_style');
const deselect_level1 = document.getElementById('deselect_button_level1');
const deselect_modal = document.getElementById('deselect_modal_button');
const submit_selection = document.getElementById('submit_selection_button');

let selected_recommend_style = null;


function openModal() {
    modal_level1.style.display = 'block';
    // 既に選択されているスタイルがあれば、そのカードを選択状態にする
    if (selected_recommend_style) {
        cards.forEach(card => {
            if (card.getAttribute('data-value') === selected_recommend_style) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    } else {
        cards.forEach(card => card.classList.remove('selected'));
    }
}
// モーダルを閉じる関数
function closeModal1() {
    modal_level1.style.display = "none";
}


// ボタンがクリックされたときにモーダルを表示
openButton.addEventListener('click', openModal);
// 「X」ボタンがクリックされたときにモーダルを非表示にする
modal1_closeButton.addEventListener('click', closeModal1);
// モーダル外をクリックした場合も閉じるようにする（オプション）
window.addEventListener('click', function (event) {
    if (event.target === modal_level1) {
        modal_level1.style.display = 'none';
    }
});

// カードがクリックされたときの処理
travelStyleContainer.addEventListener('click', function (event) {
    const clickedCard = event.target.closest('.card');
    if (!clickedCard) return; // カード以外がクリックされた場合は無視

    // クリックされたカードを選択状態にし、他のカードの選択を解除
    cards.forEach(card => {
        if (card === clickedCard) {
            card.classList.toggle('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // 選択された値を更新
    if (clickedCard.classList.contains('selected')) {
        selected_recommend_style = clickedCard.getAttribute('data-value');
    } else {
        selected_recommend_style = null;
    }
});

// フォームの送信を処理（「選択」ボタン）
submit_selection.addEventListener('click', function () {
    if (selected_recommend_style) {
        selectedStyle.textContent = selected_recommend_style;
        closeModal1();
    } else {
        alert('旅行スタイルを選択してください。');
    }
});

// メインページの「選択解除」ボタンをクリックしたときの処理
deselect_level1.addEventListener('click', function () {
    selectedStyle.textContent = '何も選択されていません';
    selected_recommend_style = null;
    cards.forEach(card => card.classList.remove('selected'));
});

// モーダル内の「選択解除」ボタンをクリックしたときの処理
deselect_modal.addEventListener('click', function () {
    // 選択されたスタイルをリセット
    selectedStyle.textContent = '何も選択されていません';
    selected_recommend_style = null;
    // 全てのカードの選択状態を解除
    cards.forEach(card => card.classList.remove('selected'));
    // モーダルを閉じる
    closeModal1();
});

//-------------------------------------------------スポット詳細モーダルを閉じる

// モーダルの閉じるボタン
const spot_modal_closeButton = document.querySelector(".spot-modal-close-button");
spot_modal_closeButton.addEventListener("click", () => {
    const modal = document.getElementById("spotinfo_modal");
    modal.style.display = "none";
});

// モーダル外をクリックしたら閉じる
window.addEventListener("click", (event) => {
    const modal = document.getElementById("spotinfo_modal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
});


//----------------------------ランダムスポットを表示するモーダル

// モーダルの要素を取得
const modal_level2 = document.getElementById("modal_level2");
const closeButton = modal_level2.querySelector(".modal-level2-close-button");
const spotsContainer = document.getElementById("spots_container");
const refreshSpotButton = document.getElementById("refresh_spot_button");
const loadingIndicator = document.getElementById("loading_indicator");

// 選択したスポットを表示するコンテナの要素を取得
const selectedSpotsContainer = document.getElementById("selected_spots_container");
const selectedSpotsList = document.getElementById("selected_spots_list");

// メインページの選択したスポットを表示する要素
const selected_spot_level2 = document.getElementById("selected_spot_level2");

//ボタンの要素を取得
const completeButton = document.getElementById("complete_button");
const deselectAllButton = document.getElementById("deselect_all_button");
const deselect_button_level2 = document.getElementById("deselect_button_level2");

// 選択したスポットを保持する配列
let selectedSpots = [];

// モーダルを閉じる関数
function closeModal2() {
    modal_level2.style.display = "none";
    updateSelectedSpotsDisplay();
}

// モーダルを閉じるイベントリスナー
closeButton.addEventListener("click", closeModal2);

// モーダル外をクリックしたら閉じる
window.addEventListener("click", (event) => {
    if (event.target == modal_level2) {
        closeModal2();
    }
});

// ランダムスポットを取得してモーダルに表示する関数
async function fetchAndDisplayRandomSpot() {
    console.log("ランダムスポットを取得中...");
    loadingIndicator.style.display = "block"; // ローディング開始
    spotsContainer.innerHTML = ""; // 既存のスポット情報をクリア

    try {
        const response = await fetch('/get_random_spot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ selected_pref: selected_pref }),
        });

        if (!response.ok) {
            throw new Error("fetchに失敗しました");
        }
        const data = await response.json();
        console.log(data); // Pythonからのデータをログに出力

        const randomSpots = data.random_spots;
        const noImageUrl = "static/images/NoImage.jpg";

        // 各スポットを表示
        for (const spot of randomSpots) {
            const [spotName, prefecture] = spot;

            // ここで写真URLがないため、代替画像を使用します
            const photoUrl = "static/images/" + prefecture + "/" + spotName + ".jpg";

            // スポットカードの作成
            const spotCard = document.createElement("div");
            spotCard.classList.add("spot-card");

            // スポット画像の追加
            const spotImage = document.createElement("img");
            spotImage.src = await loadSpotImage(photoUrl, noImageUrl); // デフォルトで代替画像を設定
            spotImage.alt = "スポット画像";
            spotCard.appendChild(spotImage);

            // スポット情報のコンテナ
            const spotInfo = document.createElement("div");
            spotInfo.style.flex = "1";

            // スポット名の追加
            const spotNameElement = document.createElement("h3");
            spotNameElement.textContent = spotName;
            spotInfo.appendChild(spotNameElement);

            // スポットの都道府県の追加
            const prefectureElement = document.createElement("p");
            prefectureElement.textContent = prefecture;
            spotInfo.appendChild(prefectureElement);

            // チェックボックスの追加
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `spot_${spotName}`;
            checkbox.value = spotName+`[地域:${prefecture}]`;
            checkbox.checked = selectedSpots.includes(spotName);
            checkbox.addEventListener("change", handleSpotSelection);

            const label = document.createElement("label");
            label.htmlFor = `spot_${spotName}`;
            label.textContent = "選択";

            spotInfo.appendChild(checkbox);
            spotInfo.appendChild(label);

            spotCard.appendChild(spotInfo);

            // スポットカードをコンテナに追加
            spotsContainer.appendChild(spotCard);
        }

    } catch (error) {
        console.error('エラー:', error);
        const errorMsg = document.createElement("p");
        errorMsg.textContent = "スポットの取得中にエラーが発生しました。";
        spotsContainer.appendChild(errorMsg);
        const noImage = document.createElement("img");
        noImage.src = "/static/images/no_image_available.png"; // 代替画像を設定
        noImage.alt = "スポット画像";
        noImage.style.width = "100%";
        noImage.style.maxHeight = "400px";
        spotsContainer.appendChild(noImage);
    } finally {
        loadingIndicator.style.display = "none"; // ローディング終了
    }
}

// スポットの選択/解除を処理する関数
function handleSpotSelection(event) {
    const spotName = event.target.value;
    if (event.target.checked) {
        if (!selectedSpots.includes(spotName)) {
            selectedSpots.push(spotName);
        }
    } else {
        selectedSpots = selectedSpots.filter(name => name !== spotName);
    }
    updateSelectedSpotsInModal();
}

// モーダル内の選択したスポットを更新する関数
function updateSelectedSpotsInModal() {
    selectedSpotsList.innerHTML = '';
    selectedSpots.forEach(spot => {
        const li = document.createElement('li');

        const span = document.createElement('span');
        span.textContent = spot;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.classList.add('remove-spot');
        removeButton.addEventListener('click', () => {
            removeSpot(spot);
        });

        li.appendChild(span);
        li.appendChild(removeButton);
        selectedSpotsList.appendChild(li);
    });
}
// スポットを個別に削除する関数
function removeSpot(spotName) {
    // selectedSpotsから削除
    selectedSpots = selectedSpots.filter(name => name !== spotName);

    // チェックボックスを解除
    const checkbox = document.getElementById(`spot_${spotName}`);
    if (checkbox) {
        checkbox.checked = false;
    }

    // モーダル内のリストを更新
    updateSelectedSpotsInModal();
}

// モーダルを閉じた際に選択したスポットをメインに表示する関数
function updateSelectedSpotsDisplay() {
    if (selectedSpots.length > 0) {
        selected_spot_level2.innerHTML = selectedSpots.join('<br>');
    } else {
        selected_spot_level2.textContent = '何も選択されていません';
    }
}

// 「完了」ボタンのクリックイベント
completeButton.addEventListener("click", () => {
    closeModal2();
});

// 「すべて解除」ボタンのクリックイベント
deselectAllButton.addEventListener("click", () => {
    selectedSpots = [];
    updateSelectedSpotsInModal();
    // チェックボックスも全て解除
    const checkboxes = spotsContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedSpotsDisplay();
});

// 「違うスポットを見る」ボタンのクリックイベント
refreshSpotButton.addEventListener("click", async () => {
    await fetchAndDisplayRandomSpot();
});

// 「スポットを選択」ボタンが押されたらモーダルを開く
document.getElementById("modal_level2_openButton").addEventListener("click", async () => {
    await fetchAndDisplayRandomSpot();
    modal_level2.style.display = "block";
});

// 「選択解除」ボタンのクリックイベント
deselect_button_level2.addEventListener("click", function () {
    selectedSpots = [];
    updateSelectedSpotsInModal();
    // チェックボックスも全て解除
    const checkboxes = spotsContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedSpotsDisplay();
});