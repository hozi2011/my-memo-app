const projectNameInput = document.getElementById('projectName');
const createProjectButton = document.getElementById('createProjectButton');
const projectSelector = document.getElementById('projectSelector');
const loadProjectButton = document.getElementById('loadProjectButton');
const deleteProjectButton = document.getElementById('deleteProjectButton');

const memoInput = document.getElementById('memoInput');
const memoDate = document.getElementById('memoDate');
const memoAmount = document.getElementById('memoAmount');
const memoPayer = document.getElementById('memoPayer');
const memoCategory = document.getElementById('memoCategory');
const newCategoryInput = document.getElementById('newCategoryInput');
const addCategoryButton = document.getElementById('addCategoryButton');
const deleteCategorySelector = document.getElementById('deleteCategorySelector');
const deleteCategoryButton = document.getElementById('deleteCategoryButton');
const addButton = document.getElementById('addButton');
const memoList = document.getElementById('memoList');
const summaryDiv = document.getElementById('summary');
const settleButton = document.getElementById('settleButton');
const settlementResults = document.getElementById('settlementResults');
const exportPayerSelector = document.getElementById('exportPayerSelector');
const exportPayerButton = document.getElementById('exportPayerButton');

let currentProject = 'default';

// 案件リストを保存
function saveProjectList(projects) {
    localStorage.setItem('projectList', JSON.stringify(projects));
}

// 案件リストを読み込み
function loadProjectList() {
    const projects = JSON.parse(localStorage.getItem('projectList')) || [];
    projectSelector.innerHTML = '';
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectSelector.appendChild(option);
    });
    if (projects.length > 0) {
        currentProject = projectSelector.value;
    } else {
        currentProject = 'default';
    }
}

// カテゴリをローカルストレージに保存する関数
function saveCategories(categories) {
    localStorage.setItem('categories', JSON.stringify(categories));
}

// カテゴリを読み込んでセレクトボックスに表示する関数
function loadCategories() {
    const savedCategories = JSON.parse(localStorage.getItem('categories')) || ['未分類', '食費', '交通費', '日用品', 'その他'];
    
    // メモ追加用のセレクトボックスを更新
    memoCategory.innerHTML = '';
    savedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        memoCategory.appendChild(option);
    });

    // 削除用のセレクトボックスを更新
    deleteCategorySelector.innerHTML = '';
    savedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        deleteCategorySelector.appendChild(option);
    });

    return savedCategories;
}

// メモを読み込む
function loadMemos() {
    const savedMemos = JSON.parse(localStorage.getItem(currentProject)) || [];
    memoList.innerHTML = '';
    savedMemos.forEach(memo => {
        addMemoToPage(memo.text, memo.date, memo.amount, memo.payer, memo.category || '未分類');
    });
    calculateTotal();
    calculateSettlement();
}

// メモをページに追加する関数
function addMemoToPage(memoText, memoDate, memoAmount, memoPayer, memoCategory) {
    const newRow = document.createElement('tr');
    
    const dateCell = document.createElement('td');
    dateCell.textContent = memoDate;

    const payerCell = document.createElement('td');
    payerCell.textContent = memoPayer;
    
    const categoryCell = document.createElement('td');
    categoryCell.textContent = memoCategory;

    const amountCell = document.createElement('td');
    amountCell.textContent = `${memoAmount}円`;

    const textCell = document.createElement('td');
    textCell.textContent = memoText;

    const actionCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '削除';

    const editButton = document.createElement('button');
    editButton.textContent = '編集';

    deleteButton.addEventListener('click', () => {
        newRow.remove();
        saveMemos();
        calculateTotal();
        calculateSettlement();
    });

    editButton.addEventListener('click', () => {
        memoDate.value = dateCell.textContent;
        memoPayer.value = payerCell.textContent;
        memoCategory.value = categoryCell.textContent;
        memoAmount.value = parseInt(amountCell.textContent.replace('円', ''));
        memoInput.value = textCell.textContent;
        newRow.remove();
        saveMemos();
        calculateTotal();
        calculateSettlement();
    });

    actionCell.appendChild(deleteButton);
    actionCell.appendChild(editButton);

    newRow.appendChild(dateCell);
    newRow.appendChild(payerCell);
    newRow.appendChild(categoryCell);
    newRow.appendChild(amountCell);
    newRow.appendChild(textCell);
    newRow.appendChild(actionCell);

    memoList.appendChild(newRow);
}

// メモを保存する関数
function saveMemos() {
    const currentMemos = [];
    memoList.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const datePart = cells[0].textContent;
            const payerPart = cells[1].textContent;
            const categoryPart = cells[2].textContent;
            const amountPart = parseInt(cells[3].textContent.replace('円', ''));
            const textPart = cells[4].textContent;
            currentMemos.push({ date: datePart, text: textPart, amount: amountPart, payer: payerPart, category: categoryPart });
        }
    });
    localStorage.setItem(currentProject, JSON.stringify(currentMemos));
}

// 合計金額を人別に計算して表示する関数
function calculateTotal() {
    const savedMemos = JSON.parse(localStorage.getItem(currentProject)) || [];
    const payerTotals = {};

    savedMemos.forEach(memoItem => {
        const payer = memoItem.payer || '不明';
        const amount = memoItem.amount || 0;
        if (payerTotals[payer]) {
            payerTotals[payer] += amount;
        } else {
            payerTotals[payer] = amount;
        }
    });
    
    const totalDisplayDiv = document.getElementById('totalDisplay');
    totalDisplayDiv.innerHTML = '';

    const overallTotal = Object.values(payerTotals).reduce((sum, current) => sum + current, 0);

    const overallTotalElement = document.createElement('p');
    overallTotalElement.innerHTML = `<strong>全体の合計金額：${overallTotal.toLocaleString()}円</strong>`;
    totalDisplayDiv.appendChild(overallTotalElement);

    const payerList = document.createElement('ul');
    for (const payer in payerTotals) {
        const payerItem = document.createElement('li');
        payerItem.textContent = `${payer}の合計：${payerTotals[payer].toLocaleString()}円`;
        payerList.appendChild(payerItem);
    }
    totalDisplayDiv.appendChild(payerList);

    // グラフをレンダリング
    renderChart(payerTotals);

    // 支払い者リストを更新
    const payers = Object.keys(payerTotals);
    exportPayerSelector.innerHTML = '<option value="all">全員</option>';
    payers.forEach(payer => {
        const option = document.createElement('option');
        option.value = payer;
        option.textContent = payer;
        exportPayerSelector.appendChild(option);
    });
}

// 精算を計算して表示する関数
function calculateSettlement() {
    const savedMemos = JSON.parse(localStorage.getItem(currentProject)) || [];
    const balances = {};
    
    savedMemos.forEach(memoItem => {
        const payer = memoItem.payer;
        const amount = memoItem.amount;
        if (balances[payer]) {
            balances[payer] += amount;
        } else {
            balances[payer] = amount;
        }
    });

    const overallTotal = Object.values(balances).reduce((sum, current) => sum + current, 0);
    const numPayers = Object.keys(balances).length;
    const perPerson = numPayers > 0 ? overallTotal / numPayers : 0;

    settlementResults.innerHTML = '';
    const title = document.createElement('h2');
    title.textContent = '精算結果';
    settlementResults.appendChild(title);
    
    const resultList = document.createElement('ul');

    for (const payer in balances) {
        const balance = balances[payer] - perPerson;
        const resultItem = document.createElement('li');
        if (balance > 0) {
            resultItem.textContent = `${payer}は${Math.round(balance)}円受け取ります`;
        } else if (balance < 0) {
            resultItem.textContent = `${payer}は${Math.round(Math.abs(balance))}円支払います`;
        } else {
            resultItem.textContent = `${payer}の精算は完了しています`;
        }
        resultList.appendChild(resultItem);
    }
    settlementResults.appendChild(resultList);
}

// ページをきれいに
function clearPage() {
    memoList.innerHTML = '';
    summaryDiv.innerHTML = '';
    settlementResults.innerHTML = '';
    if (window.myChartInstance) {
        window.myChartInstance.destroy();
    }
}

// グラフを描画する関数
function renderChart(payerTotals) {
    const ctx = document.getElementById('myChart');

    // 既存のグラフがあれば破棄
    if (window.myChartInstance) {
        window.myChartInstance.destroy();
    }

    const labels = Object.keys(payerTotals);
    const data = Object.values(payerTotals);
    
    // ランダムな色を生成する関数
    const backgroundColors = labels.map(() => {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, 0.8)`;
    });

    window.myChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: '立て替え金額の割合'
                }
            }
        },
    });
}

// ソート機能のロジック
let sortDirection = {};

function sortMemos(key, type) {
    const savedMemos = JSON.parse(localStorage.getItem(currentProject)) || [];
    
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.classList.remove('asc', 'desc');
    });

    if (sortDirection[key] === 'asc') {
        sortDirection[key] = 'desc';
    } else {
        sortDirection[key] = 'asc';
    }

    savedMemos.sort((a, b) => {
        const valueA = a[key];
        const valueB = b[key];

        if (type === 'number') {
            return sortDirection[key] === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
            return sortDirection[key] === 'asc' ? String(valueA).localeCompare(String(valueB)) : String(valueB).localeCompare(String(valueA));
        }
    });

    const headerId = `sort${key.charAt(0).toUpperCase() + key.slice(1)}`;
    const currentHeader = document.getElementById(headerId);
    if (currentHeader) {
        const currentIcon = currentHeader.querySelector('.sort-icon');
        if (currentIcon) {
            currentIcon.classList.add(sortDirection[key]);
        }
    }

    memoList.innerHTML = '';
    savedMemos.forEach(memo => {
        addMemoToPage(memo.text, memo.date, memo.amount, memo.payer, memo.category || '未分類');
    });
    saveMemos();
}

// ドキュメントが完全に読み込まれた後に実行
document.addEventListener('DOMContentLoaded', () => {
    const sortDate = document.getElementById('sortDate');
    const sortPayer = document.getElementById('sortPayer');
    const sortCategory = document.getElementById('sortCategory');
    const sortAmount = document.getElementById('sortAmount');
    const sortMemo = document.getElementById('sortMemo');

    if (sortDate) {
        sortDate.addEventListener('click', () => {
            sortMemos('date', 'date');
        });
    }
    if (sortPayer) {
        sortPayer.addEventListener('click', () => {
            sortMemos('payer', 'string');
        });
    }
    if (sortCategory) {
        sortCategory.addEventListener('click', () => {
            sortMemos('category', 'string');
        });
    }
    if (sortAmount) {
        sortAmount.addEventListener('click', () => {
            sortMemos('amount', 'number');
        });
    }
    if (sortMemo) {
        sortMemo.addEventListener('click', () => {
            sortMemos('text', 'string');
        });
    }

    loadCategories();
    loadProjectList();

    const lastProject = localStorage.getItem('lastProject');
    if (lastProject && JSON.parse(localStorage.getItem('projectList')).includes(lastProject)) {
        projectSelector.value = lastProject;
        currentProject = lastProject;
        loadMemos();
    } else if (localStorage.getItem(currentProject)) {
        loadMemos();
    }

    projectSelector.addEventListener('change', () => {
        localStorage.setItem('lastProject', projectSelector.value);
    });

    loadProjectButton.addEventListener('click', () => {
        currentProject = projectSelector.value;
        clearPage();
        loadMemos();
        localStorage.setItem('lastProject', currentProject);
    });

    createProjectButton.addEventListener('click', () => {
        const projectName = projectNameInput.value.trim();
        if (projectName) {
            const projects = JSON.parse(localStorage.getItem('projectList')) || [];
            if (!projects.includes(projectName)) {
                projects.push(projectName);
                saveProjectList(projects);
                loadProjectList();
                projectSelector.value = projectName;
                currentProject = projectName;
                clearPage();
                calculateTotal();
                calculateSettlement();
            } else {
                alert('この案件名はすでに存在します。');
            }
            projectNameInput.value = '';
        }
    });

    loadProjectButton.addEventListener('click', () => {
        currentProject = projectSelector.value;
        clearPage();
        loadMemos();
    });

    deleteProjectButton.addEventListener('click', () => {
        const projectNameToDelete = projectSelector.value;
        if (confirm(`「${projectNameToDelete}」を本当に削除してもよろしいですか？`)) {
            let projects = JSON.parse(localStorage.getItem('projectList')) || [];
            projects = projects.filter(p => p !== projectNameToDelete);
            saveProjectList(projects);

            localStorage.removeItem(projectNameToDelete);
            
            loadProjectList();
            clearPage();
            if (projects.length > 0) {
                currentProject = projects[0];
                projectSelector.value = currentProject;
                loadMemos();
            }
            calculateTotal();
            calculateSettlement();
        }
    });

    addCategoryButton.addEventListener('click', () => {
        const newCategory = newCategoryInput.value.trim();
        if (newCategory) {
            const categories = loadCategories();
            if (!categories.includes(newCategory)) {
                categories.push(newCategory);
                saveCategories(categories);
                loadCategories();
                newCategoryInput.value = '';
            } else {
                alert('そのカテゴリはすでに存在します。');
            }
        }
    });

    deleteCategoryButton.addEventListener('click', () => {
        const categoryToDelete = deleteCategorySelector.value;
        if (confirm(`「${categoryToDelete}」を本当に削除してもよろしいですか？`)) {
            let categories = loadCategories();
            categories = categories.filter(c => c !== categoryToDelete);
            saveCategories(categories);
            loadCategories();
        }
    });


    addButton.addEventListener('click', () => {
        const memoText = memoInput.value.trim();
        const amountValue = memoAmount.value;
        const payerValue = memoPayer.value.trim();
        const categoryValue = memoCategory.value;
        let dateValue = memoDate.value;

        if (dateValue === '') {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateValue = `${yyyy}-${mm}-${dd}`;
        }

        if (amountValue !== '' && payerValue !== '') {
            addMemoToPage(memoText, dateValue, amountValue, payerValue, categoryValue);
            saveMemos();
            calculateTotal();
            calculateSettlement();

            memoInput.value = '';
            memoAmount.value = '';
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            memoDate.value = `${yyyy}-${mm}-${dd}`;
            
            memoInput.focus();
        } else {
            alert('金額と支払い者のすべてを入力してください。');
        }
    });

    settleButton.addEventListener('click', () => {
        calculateSettlement();
    });

    exportPayerButton.addEventListener('click', () => {
        const selectedPayer = exportPayerSelector.value;
        const savedMemos = JSON.parse(localStorage.getItem(currentProject)) || [];
        let filteredMemos;

        if (selectedPayer === 'all') {
            filteredMemos = savedMemos;
        } else {
            filteredMemos = savedMemos.filter(memo => memo.payer === selectedPayer);
        }

        if (filteredMemos.length === 0) {
            alert("エクスポートするデータがありません。");
            return;
        }

        const headers = ["日付", "支払い者", "カテゴリ", "金額", "メモ"];
        let csv = headers.join(',') + '\n';

        filteredMemos.forEach(memoItem => {
            const row = [
                `"${memoItem.date}"`,
                `"${memoItem.payer}"`,
                `"${memoItem.category}"`,
                `"${memoItem.amount}"`,
                `"${memoItem.text}"`
            ];
            csv += row.join(',') + '\n';
        });
        
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `${currentProject}_${selectedPayer}_memos.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
});