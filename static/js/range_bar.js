const distanceBar = document.getElementById('distance_bar');
const selectedRange = document.getElementById('selected_range');

// バーの値が変更されたときのイベントリスナーを追加
distanceBar.addEventListener('input', function () {
    // ユーザが動かしたバーの値を取得
    const selectedValue = distanceBar.value;

    // ページ上にその値を表示
    selectedRange.textContent = selectedValue;

    // Pythonにデータを送るためのFetchリクエストを作成
    fetch('/distance_bar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: selectedValue }),
    })
    .then(response => response.json())
    .then(data => {
        // Pythonからの応答を処理する（必要に応じて）
        console.log(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
    });
