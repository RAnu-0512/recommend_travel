//チェックボックスの値をpythonに返却
function send_selected_aspects() {
    return new Promise((resolve, reject) => {
        function clickHandler() {
            const DecideButton = document.getElementById("decide_button")
            DecideButton.removeEventListener("click", clickHandler);

            const distanceBar = document.getElementById('distance_bar');
            const checkboxes = document.querySelectorAll('input[type=checkbox]');
            const AddButton = document.getElementById("add_selected_aspects");
            const SearchForm = document.getElementById("search_form")
            const SearchButton = document.getElementById("submit_query");
            checkboxes.forEach(checkbox => {
                checkbox.disabled = true;
            })
            distanceBar.disabled = true;
            AddButton.disabled = true;
            DecideButton.disabled = true;
            SearchButton.disabled = true;
            SearchForm.disabled = true;
            
            const selectedResults = document.getElementsByClassName('selected_result');
            const selectedResults_Array = Array.from(selectedResults);
            const selectedResultsTextArray = []
            selectedResults_Array.forEach(selectedresults_array_n=>{
                selectedResultsTextArray.push(selectedresults_array_n.textContent)
                console.log(selectedresults_array_n.textContent)
            })
            console.log("最後",selectedResultsTextArray)
            fetch('/process_selected_results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ selected_results: selectedResultsTextArray }),
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
        document.getElementById("decide_button").addEventListener('click', clickHandler);
    });

}