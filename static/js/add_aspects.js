function removeItem(element) {
    const parent = element.parentNode;
    parent.removeChild(element);
    aspect = element.querySelector(".selected_result").textContent;
    // チェックボックスを解除
    const checkbox = document.querySelector(`input[name="search_result"][value="${aspect}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
}


// スポットの選択/解除を処理する関数
function handleAspectSelection(event) {
    const aspectName = event.target.value;
    const selectedAspects = Array.from(document.querySelectorAll('#selected_results .selected_result')).map(el => el.textContent);

    if (event.target.checked) {
        if (!selectedAspects.includes(aspectName)) {
            AddSelectedAspectsDisplay(aspectName);
        }
    } else {
        // console.log("3");
        if (selectedAspects.includes(aspectName)) {
            const  aspectNameElement = Array.from(document.querySelectorAll('#selected_results > div')).find(div => {
                const selectedResult = div.querySelector('.selected_result');
                return selectedResult && selectedResult.textContent === aspectName;
            });
            removeItem(aspectNameElement)
        }
    }
}
// モーダル内の選択したスポットを更新する関数
function AddSelectedAspectsDisplay(aspectName) {
    const resultsContainer = document.getElementById("selected_results");
    const resultElement = document.createElement('div');
    const selected_aspect = document.createElement('span');
    const removeButton = document.createElement('button');
    const priorityDropdown = document.createElement('select')

    const priorityLevel1 = document.createElement('option');
    const priorityLevel2 = document.createElement('option');
    const priorityLevel3 = document.createElement('option');
    const priorityLevel4 = document.createElement('option');
    const priorityLevel5 = document.createElement('option');


    resultElement.appendChild(selected_aspect);
    resultElement.appendChild(priorityDropdown);
    resultElement.appendChild(removeButton);
    
    

    

    priorityDropdown.appendChild(priorityLevel1);
    priorityDropdown.appendChild(priorityLevel2);
    priorityDropdown.appendChild(priorityLevel3);
    priorityDropdown.appendChild(priorityLevel4);
    priorityDropdown.appendChild(priorityLevel5);

    resultsContainer.appendChild(resultElement);

    resultElement.className = "selected_aspect_container"

    selected_aspect.className = "selected_result";
    selected_aspect.textContent = aspectName;
    
    removeButton.className = "remove_button";
    removeButton.textContent = '削除';
    removeButton.onclick = function () {
        removeItem(resultElement);
    };


    priorityDropdown.className = "prioritySelectDropdown";

    priorityLevel1.value = "A";
    priorityLevel1.textContent = "優先度A";
    priorityLevel2.value = "B";
    priorityLevel2.textContent = "優先度B";
    priorityLevel3.value = "C";
    priorityLevel3.textContent = "優先度C";
    priorityLevel4.value = "D";
    priorityLevel4.textContent = "優先度D";
    priorityLevel5.value = "E";
    priorityLevel5.textContent = "優先度E";

    
    
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