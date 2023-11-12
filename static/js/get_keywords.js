//検索キーワードを取る
function get_keyword() {
    document.getElementById('search_form').addEventListener('submit', function (e){
        e.preventDefault(); // ページの再読み込みを防ぐ
        const search_keyword = document.getElementById("search_keyword").value;
        console.log(search_keyword)

        // fetchリクエストを送信
        fetch('/search_form', {
            method: 'POST', // または 'GET'、サーバーの要件に合わせて設定
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ search_keyword: search_keyword }), // サーバーに送信するデータ
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
        checkbox.type = "checkbox";
        checkbox.name = "search_result";
        checkbox.className = "search_result";
        checkbox.value = result.value; // 結果の値をセット
        resultElement.appendChild(checkbox);

        const label = document.createElement('label');
        label.textContent = result.label;
        resultElement.appendChild(label);

        resultsContainer.appendChild(resultElement);
    });
}