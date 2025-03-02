// 임시: GitHub Pages에서 401 에러를 피하기 위해 토큰 직접 입력 (나중에 서버로 이동 권장)
const GITHUB_TOKEN = "ghp_yJu25ADJwD2yTtC93aDeksDC7fYSN0nz2xC"; // 새로 생성한 토큰으로 교체

const GITHUB_USERNAME = "yong0405";
const REPO_NAME = "nas";
const FILE_PATH = "folderTree.json";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`;

let folderData = {
    name: "31-용역",
    id: "용역",
    depth: 0,
    children: []
};

function toggleVisibility(id) {
    var element = document.getElementById(id);
    if (element) element.classList.toggle('hidden');
}

function addFolder(parentId) {
    var newFolderName = prompt("추가할 폴더 이름을 입력하세요:");
    if (!newFolderName) return;

    const parentNode = findNode(folderData, parentId);
    const depth = parentNode.depth + 1;
    const uniqueId = 'folder_' + Date.now();
    
    const newFolder = {
        name: newFolderName,
        id: uniqueId,
        depth: depth,
        children: depth < 3 ? [] : null
    };
    
    parentNode.children.push(newFolder);
    renderTree();
    saveTree();
}

function renameFolder(element) {
    const folderId = element.parentNode.querySelector('ul').id;
    const newName = prompt("새로운 폴더 이름을 입력하세요:");
    if (!newName) return;

    const node = findNode(folderData, folderId);
    node.name = newName;
    renderTree();
    saveTree();
}

function removeFolder(element) {
    if (!confirm("정말 삭제 하시겠습니까?")) return;
    
    const folderId = element.parentNode.querySelector('ul')?.id;
    removeNode(folderData, folderId);
    renderTree();
    saveTree();
}

function findNode(node, id) {
    if (node.id === id) return node;
    if (!node.children) return null;
    for (let child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
    }
    return null;
}

function removeNode(node, id) {
    if (!node.children) return;
    node.children = node.children.filter(child => child.id !== id);
    node.children.forEach(child => removeNode(child, id));
}

function renderTree() {
    const treeElement = document.getElementById("folderTree");
    treeElement.innerHTML = renderNode(folderData);
}

function renderNode(node) {
    const isLeaf = !node.children || node.depth >= 3;
    const icon = isLeaf ? "📄 " : "📁 ";
    const folderClass = isLeaf ? "" : "folder";
    
    let html = `<li>
        <span class="${folderClass}" onclick="toggleVisibility('${node.id}')">${icon}<span class="folder-name">${node.name}</span></span>
        <span class="controls" onclick="addFolder('${node.id}')">[+]</span>
        <span class="controls" onclick="renameFolder(this)">[이름 바꾸기]</span>
        <span class="controls" onclick="removeFolder(this)">[-]</span>`;
    
    if (!isLeaf) {
        html += `<ul id="${node.id}" data-depth="${node.depth + 1}">`;
        for (let child of node.children) {
            html += renderNode(child);
        }
        html += "</ul>";
    }
    html += "</li>";
    return html;
}

async function saveTree() {
    const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(folderData, null, 2))));
    try {
        let sha;
        try {
            const existingData = await fetchGitHubData();
            sha = existingData.sha;
        } catch (e) {
            sha = null; // 파일이 없으면 새로 생성
        }

        const response = await fetch(GITHUB_API_URL, {
            method: "PUT",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Update folder structure",
                content: encodedContent,
                sha: sha
            })
        });

        if (!response.ok) throw new Error(`GitHub 저장 실패: ${response.status}`);
        console.log("✅ GitHub 저장 완료!");
    } catch (error) {
        console.error("❌ GitHub 저장 실패:", error);
    }
}

async function fetchGitHubData() {
    const response = await fetch(GITHUB_API_URL, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`, // 토큰 직접 사용 (보안 문제 있음)
            Accept: "application/vnd.github.v3+json"
        }
    });
    if (!response.ok) throw new Error(`GitHub API 요청 실패: ${response.status}`);
    return await response.json();
}

async function loadTree() {
    try {
        const existingData = await fetchGitHubData();
        folderData = JSON.parse(decodeURIComponent(escape(atob(existingData.content))));
        console.log("✅ GitHub 데이터 불러오기 완료!");
    } catch (error) {
        console.error("❌ GitHub 데이터 불러오기 실패:", error);
        // 기본 데이터로 초기화
    } finally {
        renderTree(); // 에러 여부와 관계없이 렌더링
    }
}

window.onload = function() {
    loadTree();
};
