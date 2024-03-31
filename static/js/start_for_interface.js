window.onload = function() {
    // フォーム要素を取得
    var form = document.querySelector('form[name="pref_form"]');
    // セレクトボックスの変更を監視し、フォームのaction属性を更新
    document.getElementById('pref_select').addEventListener('change', function() {
        form.action = '/' + this.value; // 選択された都道府県に基づいてaction属性を更新
    });
};