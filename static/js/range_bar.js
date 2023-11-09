$(function(){
    // ページ読み込み時にも描画されるようにする
    updateBlend();

    // スライダーを操作したときにblend画像を更新する
    $('#distance_bar').on('change', function() {
        updateBlend();
    });
});

function updateBlend() {
    // flaskの/blendエンドポイントにリクエストする
    $.ajax({
        type: 'POST',                     // リクエストメソッドはPOSTでいくぜ、という宣言
        url: '/distance_bar',                    // flaskサーバの/blendというエンドポイントにリクエストする
        data: $('#selected_range').val(),   // flaskのrequest.get_data()で取得できるデータ 
        contentType: 'application/json',  // よく分からなければおまじないの認識でいい
    })
    .then(data => {
        console.log(data); // Pythonからの応答を表示
    })
    .catch(error => {
        console.error('エラー:', error);
    });
};
