//チェックボックスの値をpythonに返却
function send_checkbox_results() {
    return new Promise((resolve, reject) => {
        function clickHandler() {
            document.getElementById("send_selected_results").removeEventListener("click", clickHandler);
            const checkboxes = document.querySelectorAll('input[type=checkbox]');
            checkboxes.forEach(checkbox => {
                checkbox.disabled = true;
            })
            const selectedCheckboxes = document.querySelectorAll('input[type=checkbox]:checked');
            const selectedValues = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
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
                    recommend_mode = "select_spot"
                    resolve();
                })
                .catch(error => {
                    console.error('エラー:', error);
                    reject(error);
                });
        }
        document.getElementById("send_selected_results").addEventListener('click', clickHandler);
    });

}