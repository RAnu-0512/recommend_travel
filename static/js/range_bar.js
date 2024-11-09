//初期値の表示
const distanceBar = document.getElementById('distance_bar');
const distance_decide_button = document.getElementById('distance_decide_button');
const selectedRange = document.getElementById('selected_range');
const selectedValue = distanceBar.value;
selectedRange.textContent = selectedValue;
function range_bar_always() {
    let lastSelectedValue = distanceBar.value;
    distanceBar.addEventListener('input', function () {
        const selectedValue = distanceBar.value;
        selectedRange.textContent = selectedValue;
        lastSelectedValue = selectedValue;
    });
}