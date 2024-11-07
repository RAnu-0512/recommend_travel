//検索キーワードを取る
function get_keyword(selected_pref) {
    document.getElementById('search_form').addEventListener('submit', function (e) {
        e.preventDefault(); // ページの再読み込みを防ぐ
        const search_keyword = document.getElementById("search_keyword").value;
        console.log(search_keyword)
        document.getElementById("submit_query").disabled = true;
        // fetchリクエストを送信
        fetch('/search_form', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ search_keyword: search_keyword ,selected_pref: selected_pref}), 
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("fetchに失敗しました");
                }
                return res.json()
            })
            .then(data => {
                console.log(data); // Pythonからの観点を返却
                displaySearchResults(data.keyword);
                document.getElementById("submit_query").disabled = false;
            })
            .catch(error => {
                console.error('エラー:', error);
                document.getElementById("submit_query").disabled = false;
            });
    });

    //おすすめ観点
    document.getElementById("recommend_aspect_button").addEventListener("click", () => {
        console.log("aspect recommend button clicked!")
        fetch('/recommend_aspects', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({selected_pref: selected_pref }), 
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("fetchに失敗しました");
                }
                return res.json()
            })
            .then(data => {
                console.log(data); // Pythonからの観点を返却
                displaySearchResults(data.recommend_aspects);
            })
            .catch(error => {
                console.error('エラー:', error);
            });
    });

    //ランダム観点
    document.getElementById("random_aspect_button").addEventListener("click", () => {
        console.log("random aspect button clicked!")
        fetch('/random_aspects', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({selected_pref: selected_pref }), 
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("fetchに失敗しました");
                }
                return res.json()
            })
            .then(data => {
                console.log(data); // Pythonからの観点を返却
                displaySearchResults(data.random_aspects);
            })
            .catch(error => {
                console.error('エラー:', error);
            });
    });
}

//リザルトをチェックボックスで表示
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('makecheckboxes');
    resultsContainer.innerHTML = ''; // 既存の結果をクリア

    results.forEach((result, index) => {
        const resultElement = document.createElement('div');
        const checkbox = document.createElement('input');
        const selectedAspects = Array.from(document.querySelectorAll('#selected_results .selected_result')).map(el => el.textContent);

        checkbox.type = "checkbox";
        checkbox.name = "search_result";
        checkbox.className = "search_result";
        checkbox.value = result.value; // 結果の値をセット
        checkbox.checked = selectedAspects.includes(result.value);
        checkbox.style.width = "17px"; // 任意のサイズに変更
        checkbox.style.height = "17px"; // 任意のサイズに変更
        checkbox.addEventListener("change", handleAspectSelection);

        resultElement.appendChild(checkbox);
        const label = document.createElement('label');
        label.textContent = result.label;
        resultElement.appendChild(label);

        resultsContainer.appendChild(resultElement);
    });
}