// 既存のコードに以下を追加
document.getElementById('send_selected_results').addEventListener('click', function () {
    const selectedCheckboxes = document.querySelectorAll('input[type=checkbox]:checked');
    const selectedValues = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    
    // 選択されたチェックボックスの値をサーバーに送信
    fetch('/process_selected_results', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selected_results: selectedValues }),
    })
    .then((res) => {
        if (!res.ok) {
            throw new Error("fetchに失敗しました");
        }
        return res.json();
    })
    .then(data => {
        console.log(data); // Pythonからの応答を表示
        // 何らかの処理を行う場合はここで処理を記述
    })
    .catch(error => {
        console.error('エラー:', error);
    });
});