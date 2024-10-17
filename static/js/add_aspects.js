function removeItem(element) {
    console.log("受けとったエレメント", element)
    const parent = element.parentNode;
    parent.removeChild(element);
    console.log("削除するエレメント:",element)
    aspect = element.querySelector(".selected_result").textContent;
    console.log(aspect)
    // チェックボックスを解除
    const checkbox = document.querySelector(`input[name="search_result"][value="${aspect}"]`);
    console.log("削除する項目" + aspect +checkbox);
    if (checkbox) {
        checkbox.checked = false;
    }
}


// スポットの選択/解除を処理する関数
function handleAspectSelection(event) {
    const aspectName = event.target.value;
    console.log("handleAspectSelection" + aspectName);
    const selectedAspects = Array.from(document.querySelectorAll('#selected_results .selected_result')).map(el => el.textContent);
    console.log("handleAspectSelection" + selectedAspects);

    if (event.target.checked) {
        console.log("1");
        if (!selectedAspects.includes(aspectName)) {
            console.log("2");
            AddSelectedAspectsDisplay(aspectName);
        }
    } else {
        console.log("3");
        if (selectedAspects.includes(aspectName)) {
            const  aspectNameElement = Array.from(document.querySelectorAll('#selected_results > div')).find(div => {
                const selectedResult = div.querySelector('.selected_result');
                return selectedResult && selectedResult.textContent === aspectName;
            });
            console.log("チェックボックスが外れた",aspectName);
            removeItem(aspectNameElement)
        }
    }
}
// モーダル内の選択したスポットを更新する関数
function AddSelectedAspectsDisplay(aspectName) {
    const resultsContainer = document.getElementById("selected_results");
    const resultElement = document.createElement('div');
    const selected_aspect = document.createElement('span');
    selected_aspect.className = "selected_result";
    selected_aspect.textContent = aspectName;
    resultElement.appendChild(selected_aspect);

    const removeButton = document.createElement('button');
    removeButton.className = "remove_button";
    removeButton.textContent = '削除';

    removeButton.onclick = function () {
        console.log("削除ボタンが押された",resultElement)
        removeItem(resultElement);
    };

    resultElement.appendChild(removeButton);
    resultsContainer.appendChild(resultElement);
}



document.getElementById("delete_button").addEventListener("click", function () {
    var selectedResults = document.getElementById("selected_results");
    while (selectedResults.firstChild) {
        selectedResults.removeChild(selectedResults.firstChild);
    }
    document.querySelectorAll('#makecheckboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
});