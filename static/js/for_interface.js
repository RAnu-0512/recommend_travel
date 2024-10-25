
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

function add_html(index, url, spot_name, outerHTML_text, popupId) {
    return `
        <b>[${index + 1}] 
            <span class="tooltip-box" id="spotname_label">
                <a href="#" class="popup-spot-link" data-popup-id="${popupId}">
                    ${spot_name}
                </a>
                <span class="tooltip">スポットの詳細を確認できます</span>
            </span>
        </b>
        <br>${outerHTML_text}
    `;
}


function highlightSimilarAspects(aspect, similarAspects) {
    if (aspect in similarAspects) {
        return `
            <span class="tooltip-box" id="aspect_highlighted">
                ${aspect}
                <span class="tooltip">関連性が高い観点</span>
            </span>
        `;
    } else {
        return `<span class="aspect">${aspect}</span>`;
    }
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
            const selectedSpotsHTML_level2 = document.getElementById('selected_spot_level2').innerHTML;
            const selectedSpotsHTML_level3 = document.getElementById('selected_spot_level3').innerHTML;
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


            // クリックされたときの選択した観点を読み取る
            const selectedResultsContainers = document.getElementsByClassName('selected_aspect_container');
            const selectedResultsArray = Array.from(selectedResultsContainers);
            const selectedResultsDataArray = [];

            selectedResultsArray.forEach(container => {
                const aspectName = container.querySelector('.selected_result').textContent; // 観点の名前
                const priorityValue = container.querySelector('.prioritySelectDropdown').value; // 現在の優先度

                // オブジェクトとして格納
                selectedResultsDataArray.push({
                    aspect: aspectName,
                    priority: priorityValue
                });
            });

            const selectedSpots_level2 = selectedSpotsHTML_level2.split("<br>");
            const selectedSpots_level3 = selectedSpotsHTML_level3.split("<br>");
            // "何も選択されていません" を除外したフィルタリング済み配列
            const filtered_level2 = selectedSpots_level2.filter(s => s !== "何も選択されていません");
            const filtered_level3 = selectedSpots_level3.filter(s => s !== "何も選択されていません");
            let selectedSpots;
            if (filtered_level2.length === 0 && filtered_level3.length === 0) {
                selectedSpots = ["何も選択されていません"];
            } else {
                selectedSpots = filtered_level2.concat(filtered_level3);
            }
            let lastSelectedValue = distanceBar.value;

            const slider = document.getElementById('locationSlider');
            const popularityLevel = slider.value;


            console.log("選択した推薦スタイル:", selectedStyle)
            console.log("選択したスポット:", selectedSpots)
            console.log("選択した観点(優先度)", selectedResultsDataArray);
            console.log('推薦するスポットレベル:', popularityLevel); // 0-7-14
            console.log("距離", lastSelectedValue);
            console.log("選択地点", lat, lng);


            fetch("/get_recommended_spots", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ clicked_lat: lat, clicked_lng: lng, range: lastSelectedValue, selected_aspects: selectedResultsDataArray, selected_pref: selected_pref, selected_style: selectedStyle, selectedSpots: selectedSpots, popularityLevel: popularityLevel })
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
                    //      "similar_aspects":{aspect:{"senti_score":float,"count":float}},"score" :float,"selectAspectSim":float, "selectStyleSim":float,"selectSpotSim":float,"popularWight":float,"url":str}
                    data.forEach(async (element, index) => {
                        // 観点を表示する関数を更新
                        function renderAspects(aspects, sortOption, filterOption, similarAspects, majorAspects, minerAspects) {
                            return aspectsAddEvaluation(aspects, sortOption, filterOption, similarAspects, majorAspects, minerAspects);
                        }

                        function aspectsAddEvaluation(aspects, sortOption = "senti_score_high", filterOption, similarAspects, majorAspects, minerAspects) {
                            let aspectsArray = Object.entries(aspects);

                            // フィルタリングの適用
                            if (filterOption === "universal") {
                                aspectsArray = Object.entries(majorAspects);
                            } else if (filterOption === "unique") {
                                aspectsArray = Object.entries(minerAspects);
                            } else if (filterOption == "relative") {
                                aspectsArray = Object.entries(similarAspects);
                            }
                            // ソートの適用
                            aspectsArray.sort((a, b) => {
                                switch (sortOption) {
                                    case "senti_score_high":
                                        return b[1].senti_score - a[1].senti_score;
                                    case "senti_score_low":
                                        return a[1].senti_score - b[1].senti_score;
                                    case "count_high":
                                        return b[1].count - a[1].count;
                                    case "count_low":
                                        return a[1].count - b[1].count;
                                    default:
                                        return 0;
                                }
                            });

                            const aspectsHtml = aspectsArray
                                .map(([aspect, data]) =>
                                    `<span class="aspect-plus-rating">
                                        <span class="aspect">${highlightSimilarAspects(aspect, similarAspects)}</span>
                                        <span class="aspect-rating"> 
                                            <span class="rating-num">${senti2StarsEval(data.senti_score)}</span>
                                            <span class="star-ratings">
                                                <span class="star-ratings-top" style="width: calc(20% * ${senti2StarsEval(data.senti_score)});">
                                                    ★★★★★
                                                </span>
                                                <span class="star-ratings-bottom">
                                                    ★★★★★
                                                </span>
                                            </span>
                                            <span class="count-display-title">
                                                言及数: 
                                                <span class="count-display"> ${data.count} </span>
                                            </span>
                                            <span class="recommnend-factors">
                                                ${data.recommendFactors ? '次に関連しています:' +
                                        "<span style='font-weight: bold; color : #c14343'>" + data.recommendFactors + '</span>' : ''}
                                            </span>
                                        </span>
                                    </span>`)
                                .join("");
                            return aspectsHtml;
                        }

                        function aspectsAddEvaluation_noCount_top(aspects, n) {
                            // 観点を配列に変換し、senti_scoreで降順にソート
                            const sortedAspects = Object.entries(aspects)
                                .sort((a, b) => {
                                    const scoreA = senti2StarsEval(a[1].senti_score);
                                    const scoreB = senti2StarsEval(b[1].senti_score);
                                    return scoreB - scoreA; // 降順にソート
                                });

                            // 全ての観点をマッピングしてHTMLを生成
                            const aspectsHtml = sortedAspects
                                .map(([aspect, data], index) => {
                                    const className = index < n ? 'top-aspect-plus-rating' : 'buttom-aspect-plus-rating';

                                    return `
                                        <span class="${className}">
                                            <span class="aspect">${aspect}</span>
                                            <span class="aspect-rating">
                                                <span class="rating-num">${senti2StarsEval(data.senti_score)}</span>
                                                <span class="star-ratings">
                                                    <span class="star-ratings-top" style="width: calc(20% * ${senti2StarsEval(data.senti_score)});">★★★★★</span>
                                                    <span class="star-ratings-bottom">★★★★★</span>
                                                </span>
                                            </span>
                                        </span>
                                    `;
                                })
                                .join("");

                            // 'buttom-aspect-plus-rating' クラスが含まれているかをチェック
                            const hasAdditionalAspects = aspectsHtml.includes('class="buttom-aspect-plus-rating"');

                            // '...' を追加するかどうかを決定
                            const displayHtml = hasAdditionalAspects
                                ? `${aspectsHtml}<span class="etcStr">...</span>`
                                : aspectsHtml;

                            return displayHtml;
                        }


                        const similarAspectsHTML = aspectsAddEvaluation_noCount_top(element.similar_aspects, 4)
                        const similarAspects = element.similar_aspects
                        const majorAspects = element.major_aspects
                        const minerAspects = element.miner_aspects
                        const prefecture = selected_pref.replace("東京都", "東京").replace("道", "").replace("県", "").replace("京都府", "京都").replace("大阪府", "大阪");
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
                                                            <p class = "spotinfo-aspect-type">関連性が高い観点</p>
                                                            <span class="spot-aspects">
                                                            ${similarAspectsHTML}
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
                                <p>じゃらんnet: <a href="${element.url}" target="_blank">${element.url}</a></p>
                                <img src="${photo_url || noImageUrl}" alt="${replaced_spot_name}" style="max-width: 100%; height: auto;" onerror="this.onerror=null; this.src='${noImageUrl}';">
                                <div id="modal-controls">
                                    <div class="control-group">
                                        <!-- 並べ替えプルダウン -->
                                        <label for="sort-select">観点の並べ替え</label>
                                        <select id="sort-select">
                                            <option value="count_high">レビューでの言及が多い順</option>
                                            <option value="count_low">レビューでの言及が少ない順</option>
                                            <option value="senti_score_high">評価の高い順</option>
                                            <option value="senti_score_low">評価の低い順</option>
                                        </select>
                                    </div>

                                    <div class="control-group">
                                        <!-- 観点フィルタリングプルダウン -->
                                        <label for="filter-select">表示する観点</label>
                                        <select id="filter-select">
                                            <option value="all">全ての観点</option>
                                            <option value="relative">関連性の高い観点</option>
                                            <option value="universal">他のスポットでもよく見る観点</option>
                                            <option value="unique">このスポットのオリジナル観点</option>
                                        </select>
                                    </div>
                                </div>
                                <div id="aspects-container">
                                    ${renderAspects(element.aspects, "count_high", "all", similarAspects, majorAspects, minerAspects)}
                                </div>
                            `;

                                // モーダルを表示
                                modal.style.display = "block";

                                // プルダウンのイベントリスナーを設定
                                const sortSelect = document.getElementById("sort-select");
                                const filterSelect = document.getElementById("filter-select");
                                const aspectsContainer = document.getElementById("aspects-container");

                                // 並べ替えイベントリスナー
                                sortSelect.addEventListener("change", () => {
                                    const selectedSort = sortSelect.value;
                                    const selectedFilter = filterSelect.value;
                                    console.log("選択された並べ替え方法:", selectedSort);
                                    aspectsContainer.innerHTML = renderAspects(element.aspects, selectedSort, selectedFilter, similarAspects, majorAspects, minerAspects);
                                });

                                // フィルタリングイベントリスナー
                                filterSelect.addEventListener("change", () => {
                                    const selectedSort = sortSelect.value;
                                    const selectedFilter = filterSelect.value;
                                    console.log("選択された観点フィルタ:", selectedFilter);
                                    aspectsContainer.innerHTML = renderAspects(element.aspects, selectedSort, selectedFilter, similarAspects, majorAspects, minerAspects);
                                });
                            });

                            // 画像の読み込み
                            imgElement.src = await loadSpotImage(photo_url, noImageUrl);

                            // ポップアップHTMLの作成（popupId を渡す）
                            const spotAspectPopup = add_html(index, element.url, replaced_spot_name, imgElement.outerHTML, popupId);

                            // マーカーの作成と設定
                            const marker = L.marker([element.lat, element.lng])
                                .addTo(mymap)
                                .bindPopup(spotAspectPopup, { className: 'custom_popup', id: popupId })
                                .openPopup();
                            // ドキュメント全体にクリックイベントリスナーを追加
                            document.addEventListener('click', function (event) {
                                // クリックされた要素が .popup-spot-link クラスを持つ <a> タグか確認
                                if (event.target.matches('.popup-spot-link')) {
                                    event.preventDefault(); // デフォルトのリンク動作を防止
                                    // data-popup-id 属性から popupId を取得
                                    const popupId = event.target.getAttribute('data-popup-id');
                                    // 対応するボタンを取得
                                    const button = document.querySelector(`.spotinfo_detailButton[data-popup-id="${popupId}"]`);
                                    // ボタンが存在する場合、クリックイベントをトリガー
                                    if (button) {
                                        button.click();
                                    } else {
                                        console.warn(`Button with data-popup-id="${popupId}" not found.`);
                                    }
                                }
                            });

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
                    const rerecommend_button = document.getElementById('rerecommend_button_parm');
                    rerecommend_button.disabled = false;
                })
                .catch(error => {
                    console.error('マップクリック:エラー:', error);
                });
        }
        function onMapClick(e) {
            const clicked_lat = e.latlng.lat;
            const clicked_lng = e.latlng.lng; const rerecommend_button = document.getElementById('rerecommend_button_parm');
            rerecommend_button.disabled = true;
            display_recommend_spot(clicked_lat, clicked_lng)
        }
        function onReRecommendButtonClick() {
            const rerecommend_button = document.getElementById('rerecommend_button_parm');
            if (popups[0] != undefined) {
                rerecommend_button.disabled = true;
                const cur_lat = popups[0]._latlng.lat;
                const cur_lng = popups[0]._latlng.lng;
                display_recommend_spot(cur_lat, cur_lng);
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
        [lat_start, lng_start] = await readStartLatLngFile(selected_pref.replace("東京都", "東京").replace("道", "").replace("県", "").replace("京都府", "京都").replace("大阪府", "大阪"));
        console.log(selected_pref.replace("東京都", "東京").replace("道", "").replace("県", "").replace("京都府", "京都").replace("大阪府", "大阪"), lat_start, lng_start);
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
        // DOMが完全に読み込まれた後にイベントリスナーを設定
        const rerecommend_button = document.getElementById('rerecommend_button_parm');
        if (rerecommend_button) {
            rerecommend_button.addEventListener("click", onReRecommendButtonClick);
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
        const modal3_complete_button = document.getElementById("complete_button_modal3");
        if (modal3_complete_button) {
            modal3_complete_button.addEventListener('click', () => {
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
        document.getElementById("open_button_recom").style.top = "83px";
    }
    else {
        document.getElementById("recommend_style_box").style.top = "83px";
    }
    document.getElementById("parameters").style.display = "none";
    document.getElementById("open_button_parm").style.display = "";
});

document.getElementById("open_button_parm").addEventListener("click", function () {
    if (document.getElementById("recommend_style_box").style.display == "none") {
        document.getElementById("open_button_recom").style.top = "213px";
    }
    else {
        document.getElementById("recommend_style_box").style.top = "213px";
    }
    document.getElementById("parameters").style.display = "";
    document.getElementById("open_button_parm").style.display = "none";
});

//推薦プランの選択ボックス
document.getElementById("close_button_recom").addEventListener("click", function () {
    if (document.getElementById("parameters").style.display == "none") {
        document.getElementById("open_button_recom").style.top = "83px";
    }
    else {
        document.getElementById("open_button_recom").style.top = "217px";
    }
    document.getElementById("recommend_style_box").style.display = "none";
    document.getElementById("open_button_recom").style.display = "";
});

document.getElementById("open_button_recom").addEventListener("click", function () {
    if (document.getElementById("parameters").style.display == "none") {
        document.getElementById("recommend_style_box").style.top = "83px";
    }
    else {
        document.getElementById("recommend_style_box").style.top = "213px"
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

// 複数選択を管理するために配列に変更
let selected_recommend_style = [];

// モーダルを開く関数
function openModal() {
    modal_level1.style.display = 'block';
    // 既に選択されているスタイルがあれば、そのカードを選択状態にする
    if (selected_recommend_style.length > 0) {
        cards.forEach(card => {
            if (selected_recommend_style.includes(card.getAttribute('data-value'))) {
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

    const value = clickedCard.getAttribute('data-value');

    // クリックされたカードの選択状態をトグル
    clickedCard.classList.toggle('selected');

    if (clickedCard.classList.contains('selected')) {
        // まだ選択されていなければ追加
        if (!selected_recommend_style.includes(value)) {
            selected_recommend_style.push(value);
        }
    } else {
        // 選択解除された場合は配列から削除
        selected_recommend_style = selected_recommend_style.filter(item => item !== value);
    }
});

// フォームの送信を処理（「選択」ボタン）
submit_selection.addEventListener('click', function () {
    if (selected_recommend_style.length > 0) {
        // 選択されたスタイルを改行で結合して表示
        selectedStyle.textContent = selected_recommend_style.join('\n');
        closeModal1();
    } else {
        alert('旅行スタイルを選択してください。');
    }
});

// メインページの「選択解除」ボタンをクリックしたときの処理
deselect_level1.addEventListener('click', function () {
    selectedStyle.textContent = '何も選択されていません';
    selected_recommend_style = [];
    cards.forEach(card => card.classList.remove('selected'));
});

// モーダル内の「選択解除」ボタンをクリックしたときの処理
deselect_modal.addEventListener('click', function () {
    // 選択されたスタイルをリセット
    selectedStyle.textContent = '何も選択されていません';
    selected_recommend_style = [];
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
        console.log("スポットを取得しました", data); // Pythonからのデータをログに出力

        const randomSpots = data.random_spots;
        const noImageUrl = "static/images/NoImage.jpg";

        // 各スポットを表示
        for (const spot of randomSpots) {
            const spotName = spot.spot_name;
            const prefecture = spot.prefecture;
            const spot_url = spot.spot_url;
            const spot_aspects = spot.aspects;
            // Object.entriesを使用してオブジェクトを配列に変換
            const entries = Object.entries(spot_aspects);
            // countで降順にソート
            entries.sort((a, b) => b[1].count - a[1].count);
            // 上位3つを取得
            const top3Aspects = entries.slice(0, 3).map(entry => entry[0]);

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
            spotInfo.style = "position : relative;"
            // スポット名の追加
            const spotNameElement = document.createElement("span");
            spotNameElement.className = "spotname-in-card";
            spotNameElement.textContent = spotName;
            // クリックイベントを追加
            spotNameElement.style.cursor = "pointer"; // カーソルをポインターに変更
            spotNameElement.addEventListener("click", () => {
                showSpotDetails(spot);
            });
            const spotNameElementTooltip = document.createElement("span");
            spotNameElementTooltip.className = "tooltip";
            spotNameElementTooltip.textContent = "スポットの詳細を確認できます"

            spotNameElement.append(spotNameElementTooltip);
            spotInfo.appendChild(spotNameElement);
            spotInfo.appendChild(document.createElement("br")); // 新しいbr要素を追加

            // スポットの都道府県の追加
            const prefectureElement = document.createElement("span");
            prefectureElement.className = "spot-card-prefecture"
            prefectureElement.textContent = prefecture;
            spotInfo.appendChild(prefectureElement);
            spotInfo.appendChild(document.createElement("br")); // 新しいbr要素を追加
            
            // スポットの観点を追加（3つだけ）
            const spotAsepctContainer = document.createElement("div");
            spotAsepctContainer.style = "position:relative;"
            const spotAspectList = document.createElement("span");
            spotAspectList.textContent = top3Aspects.join(",");
            spotAspectList.className = "spot-card-apsect";
            // スポットの観点tooltip
            const spotAspectListTooltip = document.createElement("span");
            spotAspectListTooltip.textContent = "言及が多い観点";
            spotAspectListTooltip.className = "tooltip-spot-card-apsect";
            spotAspectList.appendChild(spotAspectListTooltip);
            spotAsepctContainer.appendChild(spotAspectList)
            spotInfo.appendChild(spotAsepctContainer);

            // チェックボックスの追加
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `spot_${spotName}`;
            checkbox.value = `${spotName}[地域:${prefecture}]`;
            checkbox.checked = selectedSpots.includes(`${spotName}[地域:${prefecture}]`);
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

        const refreshSpotButton = document.getElementById("refresh_spot_button");
        const modal2OppenButton = document.getElementById("modal_level2_openButton");
        modal2OppenButton.disabled = false;
        refreshSpotButton.disabled = false;
    } catch (error) {
        console.error('エラー:', error);
        const errorMsg = document.createElement("p");
        errorMsg.textContent = "スポットの取得中にエラーが発生しました。";
        spotsContainer.appendChild(errorMsg);
        const noImage = document.createElement("img");
        noImage.src = "static/images/NoImage.jpg"; // 代替画像を設定
        noImage.alt = "スポット画像";
        noImage.style.width = "100%";
        noImage.style.maxHeight = "400px";
        spotsContainer.appendChild(noImage);
    } finally {
        loadingIndicator.style.display = "none"; // ローディング終了
    }
}

// スポットの詳細情報を表示する関数
function showSpotDetails(spot) {
    const spotName = spot.spot_name;
    const prefecture = spot.prefecture;
    const spot_url = spot.spot_url;
    const spot_aspects = spot.aspects;

    // 詳細情報を表示する要素を取得
    const randomSpotModalContent = document.getElementById("random-spot-modal-content");

    // コンテンツをクリア
    randomSpotModalContent.innerHTML = "";

    // スポット名
    const nameElement = document.createElement("h3");
    nameElement.textContent = spotName;
    randomSpotModalContent.appendChild(nameElement);

    // 都道府県
    const prefectureElement = document.createElement("p");
    prefectureElement.innerHTML = `<strong>都道府県:</strong> ${prefecture}`;
    randomSpotModalContent.appendChild(prefectureElement);

    // スポットURL
    const urlElement = document.createElement("p");
    urlElement.innerHTML = `<strong>URL:</strong> <a href="${spot_url}" target="_blank">${spot_url}</a>`;
    randomSpotModalContent.appendChild(urlElement);

    // 観点
    const aspectsElement = document.createElement("p");
    aspectsElement.innerHTML = `<strong>観点:</strong> ${Object.entries(spot_aspects).map(entry => `${entry[0]} (${entry[1].count})`).join(", ")}`;
    randomSpotModalContent.appendChild(aspectsElement);

    // モーダルを表示
    const randomSpotModal = document.getElementById("random_spotinfo_modal");
    randomSpotModal.style.display = "block";
}

// モーダルを閉じる関数
function closeRandomSpotModal() {
    const randomSpotModal = document.getElementById("random_spotinfo_modal");
    randomSpotModal.style.display = "none";
}

// 閉じるボタンにイベントリスナーを追加
const randomSpotCloseButton = document.querySelector(".random-spot-modal-close-button");
randomSpotCloseButton.addEventListener("click", closeRandomSpotModal);

// モーダル外をクリックしたら閉じる
window.addEventListener("click", (event) => {
    const randomSpotModal = document.getElementById("random_spotinfo_modal");
    if (event.target == randomSpotModal) {
        closeRandomSpotModal();
    }
});

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
    refreshSpotButton.disabled = true;
    await fetchAndDisplayRandomSpot();
});

// 「スポットを選択」ボタンが押されたらモーダルを開く
const modal2OppenButton = document.getElementById("modal_level2_openButton");
modal2OppenButton.addEventListener("click", async () => {
    modal2OppenButton.disabled = true;
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


// --------モーダル3

// モーダルレベル3のJavaScript

// モーダルの要素を取得
const modal_level3 = document.getElementById("modal_level3");
const closeButton_level3 = modal_level3.querySelector(".modal-level3-close-button");
const searchInput_modal3 = document.getElementById("search_input_modal3");
const searchButton_modal3 = document.getElementById("search_button_modal3");
const spotsContainer_modal3 = document.getElementById("spots_container_modal3");
const loadingIndicator_modal3 = document.getElementById("loading_indicator_modal3");

// 選択したスポットを表示するコンテナの要素を取得
const selectedSpotsContainer_modal3 = document.getElementById("selected_spots_container_modal3");
const selectedSpotsList_modal3 = document.getElementById("selected_spots_list_modal3");

// メインページの選択したスポットを表示する要素
const selected_spot_level3 = document.getElementById("selected_spot_level3");

// ボタンの要素を取得
const completeButton_modal3 = document.getElementById("complete_button_modal3");
const deselectAllButton_modal3 = document.getElementById("deselect_all_button_modal3");
const deselect_button_level3 = document.getElementById("deselect_button_level3");

// 「スポットを検索」ボタンの要素を取得
const openButton_modal3 = document.getElementById("modal_level3_openButton");

// 選択したスポットを保持する配列
let selectedSpots_modal3 = [];

// モーダルを開く関数
function openModal3() {
    modal_level3.style.display = "block";
    // オプション: モーダルが開いたときに検索入力にフォーカスを当てる
    searchInput_modal3.focus();
}

// モーダルを閉じる関数
function closeModal3() {
    modal_level3.style.display = "none";
    updateSelectedSpotsDisplay_modal3();
}

// モーダルを閉じるイベントリスナー
closeButton_level3.addEventListener("click", closeModal3);

// モーダル外をクリックしたら閉じる
window.addEventListener("click", (event) => {
    if (event.target == modal_level3) {
        closeModal3();
    }
});

// 「スポットを検索」ボタンが押されたらモーダルを開く
openButton_modal3.addEventListener("click", () => {
    openModal3();
});

// 検索ボタンのクリックイベント
searchButton_modal3.addEventListener("click", () => {
    const query = searchInput_modal3.value.trim();
    searchButton_modal3.disabled = true;
    if (query !== "") {
        performSearch_modal3(query, selected_pref);
    }
    if (query == "") {
        alert("検索キーワードを入力してください。")
        searchButton_modal3.disabled = false;
    }
});

// Enterキーで検索を実行
searchInput_modal3.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        searchButton_modal3.click();
    }
});

// スポットを検索して表示する関数
async function performSearch_modal3(query, pref) {
    console.log(`検索クエリ: ${query}`);
    loadingIndicator_modal3.style.display = "block"; // ローディング開始
    spotsContainer_modal3.innerHTML = ""; // 既存のスポット情報をクリア

    try {
        const response = await fetch('/search_spot', { // 適切なエンドポイントに変更してください
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query, pref: pref }),
        });

        if (!response.ok) {
            throw new Error("検索に失敗しました");
        }

        const data = await response.json();
        console.log(data); // サーバーからのデータをログに出力

        const searchResults = data.search_spots; // サーバーから返されるデータに合わせて変更
        const noImageUrl = "static/images/NoImage.jpg";

        // 各スポットを表示
        for (const spot of searchResults) {
            const spotName = spot.spot_name;
            const prefecture = spot.prefecture;
            const spot_url = spot.spot_url;
            const spot_apsects = spot.aspects;

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
            spotInfo.style = "position: relative;"

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
            checkbox.id = `modal3_spot_${spotName}`;
            checkbox.value = `${spotName}[地域:${prefecture}]`;
            checkbox.checked = selectedSpots_modal3.includes(`${spotName}[地域:${prefecture}]`);
            checkbox.addEventListener("change", handleSpotSelection_modal3);

            const label = document.createElement("label");
            label.htmlFor = `modal3_spot_${spotName}`;
            label.textContent = "選択";

            spotInfo.appendChild(checkbox);
            spotInfo.appendChild(label);

            spotCard.appendChild(spotInfo);

            // スポットカードをコンテナに追加
            spotsContainer_modal3.appendChild(spotCard);

        }
        const searchButton_modal3 = document.getElementById("search_button_modal3");
        searchButton_modal3.disabled = false;
    } catch (error) {
        console.error('エラー:', error);
        const errorMsg = document.createElement("p");
        errorMsg.textContent = "スポットの取得中にエラーが発生しました。";
        spotsContainer_modal3.appendChild(errorMsg);
        const noImage = document.createElement("img");
        noImage.src = "/static/images/no_image_available.png"; // 代替画像を設定
        noImage.alt = "スポット画像";
        noImage.style.width = "100%";
        noImage.style.maxHeight = "400px";
        spotsContainer_modal3.appendChild(noImage);
    } finally {
        loadingIndicator_modal3.style.display = "none"; // ローディング終了
    }
}

// スポットの選択/解除を処理する関数
function handleSpotSelection_modal3(event) {
    const spotName = event.target.value;
    if (event.target.checked) {
        if (!selectedSpots_modal3.includes(spotName)) {
            selectedSpots_modal3.push(spotName);
        }
    } else {
        selectedSpots_modal3 = selectedSpots_modal3.filter(name => name !== spotName);
    }
    updateSelectedSpotsInModal_modal3();
}

// モーダル内の選択したスポットを更新する関数
function updateSelectedSpotsInModal_modal3() {
    selectedSpotsList_modal3.innerHTML = '';
    selectedSpots_modal3.forEach(spot => {
        const li = document.createElement('li');

        const span = document.createElement('span');
        span.textContent = spot;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.classList.add('remove-spot');
        removeButton.addEventListener('click', () => {
            removeSpot_modal3(spot);
        });

        li.appendChild(span);
        li.appendChild(removeButton);
        selectedSpotsList_modal3.appendChild(li);
    });
}

// スポットを個別に削除する関数
function removeSpot_modal3(spotName) {
    // selectedSpots_modal3から削除
    selectedSpots_modal3 = selectedSpots_modal3.filter(name => name !== spotName);

    // チェックボックスを解除
    const checkbox = document.getElementById(`modal3_spot_${spotName}`);
    if (checkbox) {
        checkbox.checked = false;
    }

    // モーダル内のリストを更新
    updateSelectedSpotsInModal_modal3();
}

// モーダルを閉じた際に選択したスポットをメインに表示する関数
function updateSelectedSpotsDisplay_modal3() {
    if (selectedSpots_modal3.length > 0) {
        selected_spot_level3.innerHTML = selectedSpots_modal3.join('<br>');
    } else {
        selected_spot_level3.textContent = '何も選択されていません';
    }
}

// 「完了」ボタンのクリックイベント
completeButton_modal3.addEventListener("click", () => {
    closeModal3();
});

// 「すべて解除」ボタンのクリックイベント
deselectAllButton_modal3.addEventListener("click", () => {
    selectedSpots_modal3 = [];
    updateSelectedSpotsInModal_modal3();
    // チェックボックスも全て解除
    const checkboxes = spotsContainer_modal3.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedSpotsDisplay_modal3();
});

// 「選択解除」ボタンのクリックイベント（メインページ側）
deselect_button_level3.addEventListener("click", function () {
    selectedSpots_modal3 = [];
    updateSelectedSpotsInModal_modal3();
    // チェックボックスも全て解除
    const checkboxes = spotsContainer_modal3.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedSpotsDisplay_modal3();
});

// スポット画像をロードする関数
async function loadSpotImage(photoUrl, defaultUrl) {
    try {
        const response = await fetch(photoUrl, { method: 'HEAD' });
        if (response.ok) {
            return photoUrl;
        } else {
            return defaultUrl;
        }
    } catch (error) {
        console.error('画像のロード中にエラー:', error);
        return defaultUrl;
    }
}


// -----------------
// 選択した観点の説明tooltip

document.addEventListener('DOMContentLoaded', function () {
    const tooltipTrigger = document.querySelector('.question-tooltip');
    const tooltipContent = document.querySelector('.question-tooltip-content');

    // ツールチップの表示/非表示を切り替える関数
    function toggleTooltip(event) {
        event.stopPropagation(); // イベントのバブリングを防ぐ
        tooltipTrigger.classList.toggle('active');
    }

    // ページのクリックでツールチップを閉じる
    function closeTooltip() {
        tooltipTrigger.classList.remove('active');
    }

    // はてなマークをクリックしたときにツールチップを切り替える
    tooltipTrigger.addEventListener('click', toggleTooltip);

    // ページ全体をクリックしたときにツールチップを閉じる
    document.addEventListener('click', closeTooltip);
});

document.addEventListener('DOMContentLoaded', function () {
    const distanceTooltipTrigger = document.querySelector(".distance-question-tooltip");
    const distanceTooltipContent = document.querySelector(".distance-question-tooltip-content");

    // ツールチップの表示/非表示を切り替える関数
    function toggleTooltip(event) {
        event.stopPropagation(); // イベントのバブリングを防ぐ
        distanceTooltipTrigger.classList.toggle('active');
    }

    // ページのクリックでツールチップを閉じる
    function closeTooltip() {
        distanceTooltipTrigger.classList.remove('active');
    }

    // はてなマークをクリックしたときにツールチップを切り替える
    distanceTooltipTrigger.addEventListener('click', toggleTooltip);

    // ページ全体をクリックしたときにツールチップを閉じる
    document.addEventListener('click', closeTooltip);
});


//-----------------------------select recommend spots populairty 
document.addEventListener('DOMContentLoaded', function () {
    // スライダー要素を取得
    const slider = document.getElementById('locationSlider');

    // すべてのラベルspan要素を取得
    const labels = document.querySelectorAll('.recoomend_spots_labels span');

    // 各ラベルにクリックイベントリスナーを追加
    labels.forEach(function (label) {
        label.addEventListener('click', function () {
            // data-value属性から値を取得
            const value = label.getAttribute('data-value');

            // スライダーの値を設定
            slider.value = value;

            // スライダーの値が変わったことを他のスクリプトに通知するためにイベントを発火
            slider.dispatchEvent(new Event('input'));
        });
    });
});






const spotinfo_detailButton = popupInfo.querySelector(".spotinfo_detailButton");
spotinfo_detailButton.addEventListener("click", (event) => {
    event.stopPropagation(); // 親要素のクリックイベントを防ぐ
    const modal = document.getElementById("spotinfo_modal");
    const modalBody = document.getElementById("spot-modal-content");

    // モーダルの内容を設定（必要に応じて詳細情報を追加）
    modalBody.innerHTML = `
    <h2>${replaced_spot_name} の詳細</h2>
    <p>じゃらんnet: <a href="${element.url}" target="_blank">${element.url}</a></p>
    <img src="${photo_url || noImageUrl}" alt="${replaced_spot_name}" style="max-width: 100%; height: auto;" onerror="this.onerror=null; this.src='${noImageUrl}';">
    <div id="modal-controls">
        <div class="control-group">
            <!-- 並べ替えプルダウン -->
            <label for="sort-select">観点の並べ替え</label>
            <select id="sort-select">
                <option value="count_high">レビューでの言及が多い順</option>
                <option value="count_low">レビューでの言及が少ない順</option>
                <option value="senti_score_high">評価の高い順</option>
                <option value="senti_score_low">評価の低い順</option>
            </select>
        </div>
    </div>
    <div id="aspects-container">
        ${renderAspects_light(element.aspects, "count_high")}
    </div>
`;

    // モーダルを表示
    modal.style.display = "block";

    // プルダウンのイベントリスナーを設定
    const sortSelect = document.getElementById("sort-select");
    const aspectsContainer = document.getElementById("aspects-container");

    // 並べ替えイベントリスナー
    sortSelect.addEventListener("change", () => {
        const selectedSort = sortSelect.value;
        console.log("選択された並べ替え方法:", selectedSort);
        aspectsContainer.innerHTML = renderAspects_light(element.aspects, selectedSort);
    });
});


function renderAspects_light(aspects, sortOption) {
    return aspectsAddEvaluation_light(aspects, sortOption);
}

function aspectsAddEvaluation_light(aspects, sortOption) {
    let aspectsArray = Object.entries(aspects);

    // ソートの適用
    aspectsArray.sort((a, b) => {
        switch (sortOption) {
            case "senti_score_high":
                return b[1].senti_score - a[1].senti_score;
            case "senti_score_low":
                return a[1].senti_score - b[1].senti_score;
            case "count_high":
                return b[1].count - a[1].count;
            case "count_low":
                return a[1].count - b[1].count;
            default:
                return 0;
        }
    });

    const aspectsHtml = aspectsArray
        .map(([aspect, data]) =>
            `<span class="aspect-plus-rating">
                <span class="aspect">${aspect}</span>
                <span class="aspect-rating">
                    <span class="rating-num">${senti2StarsEval(data.senti_score)}</span>
                    <span class="star-ratings">
                        <span class="star-ratings-top" style="width: calc(20% * ${senti2StarsEval(data.senti_score)});">
                            ★★★★★
                        </span>
                        <span class="star-ratings-bottom">
                            ★★★★★
                        </span>
                    </span>
                    <span class="count-display-title">
                        言及数:
                        <span class="count-display"> ${data.count} </span>
                    </span>
                </span>
            </span>`)
        .join("");
    return aspectsHtml;
}