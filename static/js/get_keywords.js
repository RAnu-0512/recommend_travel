document.getElementById('search_form').addEventListener('submit', function (e) {
  e.preventDefault(); // ページの再読み込みを防ぐ
  const search = document.getElementById("search").value;
  console.log(search)
  // Ajaxリクエストを送信
  fetch('/search', {
    method: 'POST', // または 'GET'、サーバーの要件に合わせて設定
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ search : search }), // サーバーに送信するデータ
  })
  .then((res) => {
    if (!res.ok) {
      throw new Error("fetchに失敗しました");
    }
    return res.json()
  })
  .then(data => {
    console.log(data); // Pythonからの応答を表示
  })
  .catch(error => {
    console.error('エラー:', error);
  });
})

  