const USERNAME = "willcran";
const API = "https://api.github.com";
const grid = document.querySelector("#repo-grid");
const search = document.querySelector("#search");
const languageFilters = document.querySelector("#language-filters");
const empty = document.querySelector("#repo-empty");
const notice = document.querySelector("#api-notice");
let repositories = [];
let selectedFilter = "";

const languageColors = {
"JavaScript": "#f1e05a",
"TypeScript": "#3178c6",
"Python": "#3572A5",
"Kotlin": "#A97BFF",
"Java": "#b07219",
"HTML": "#e34c26",
"CSS": "#663399",
"C": "#555555",
"C++": "#f34b7d",
"C#": "#178600",
"Shell": "#89e051",
"Dart": "#00B4AB",
"Go": "#00ADD8",
"Rust": "#dea584",
"PHP": "#4F5D95",
"Ruby": "#701516",
"Swift": "#F05138",
"Vue": "#41b883",
"Svelte": "#ff3e00",
"Jupyter Notebook": "#DA5B0B",
"PowerShell": "#012456",
"Makefile": "#427819",
"Dockerfile": "#384d54",
"Markdown": "#083fa1"
};

function getLanguageColor(language) {
return languageColors[language] || "#8b949e";
}

const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function formatDate(value) {
    if (!value) return "No recent activity";
    const date = new Date(value);
    return `Updated ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}


function renderRepositories() {
    const term = search.value.trim().toLowerCase();
    const selectedLanguages = selectedFilter
        ? selectedFilter.startsWith("[")
            ? JSON.parse(selectedFilter)
            : [selectedFilter]
        : [];

    let shown = repositories.filter(repo => {
        const matchesTerm = `${repo.name} ${repo.description || ""} ${repo.language || ""}`
            .toLowerCase()
            .includes(term);

        const matchesLanguage = !selectedLanguages.length ||
            selectedLanguages.includes(repo.language);

        return matchesTerm && matchesLanguage;
    });

    shown.sort((a, b) => a.name.localeCompare(b.name));

    grid.innerHTML = shown.map(repo => `
    <article class="repo">
        <div class="repo-top">
            <a class="repo-name" href="${escapeHTML(repo.html_url)}" target="_blank" rel="noreferrer">${escapeHTML(repo.name)}</a>
            <span class="repo-icon" aria-label="Public repository" title="Public repository">↗</span>
        </div>
        <p class="repo-desc">${escapeHTML(repo.description || "No description has been added yet.")}</p>
        <div class="repo-bottom">
            <span class="language">${repo.language ? `<i class="dot" aria-hidden="true"></i>${escapeHTML(repo.language)}` : "Language not specified"}</span>
            <span class="repo-meta">
                <span title="Stars">☆ ${repo.stargazers_count}</span>
                <span title="Forks">⑂ ${repo.forks_count}</span>
            </span>
        </div>
        <div class="repo-bottom" style="margin-top:12px"><span>${formatDate(repo.updated_at)}</span></div>
    </article>`).join("");

    empty.classList.toggle("hidden", shown.length !== 0);
}

async function loadPortfolio() {
    try {
        const profileResponse = await fetch(`${API}/users/${USERNAME}`, {
            headers: { Accept: "application/vnd.github+json" },
            cache: "no-store"
        });

        if (!profileResponse.ok) throw new Error(
            profileResponse.status === 403 || profileResponse.status === 429
                ? "GitHub has temporarily rate-limited requests. Try refreshing in a little while."
                : `GitHub profile request failed (${profileResponse.status}).`
        );

        const profile = await profileResponse.json();
        document.querySelector('meta[name="description"]').content =
            profile.bio || `Projects and open-source work by ${profile.login}.`;

        const avatar = document.querySelector("#avatar");
        avatar.src = profile.avatar_url;
        avatar.alt = `${profile.login}'s GitHub profile picture`;

        document.querySelector("#profile-name").textContent = profile.name || profile.login;
        document.querySelector("#bio").textContent = profile.bio || "No GitHub bio added yet.";
        document.querySelector("#nav-github").href = profile.html_url;
        document.querySelector("#profile-button").href = profile.html_url;
        document.querySelector("#all-repos").href = `${profile.html_url}?tab=repositories`;

        document.querySelector("#stats").innerHTML = `
            <span class="stat"><strong>${profile.public_repos}</strong> public repositories</span>
            <span class="stat"><strong>${profile.followers}</strong> followers</span>
            <span class="stat"><strong>${profile.following}</strong> following</span>`;

        document.querySelector("#profile-status").textContent = "";

        const repoResponse = await fetch(
            `${API}/users/${USERNAME}/repos?type=owner&sort=updated&per_page=100`,
            {
                headers: { Accept: "application/vnd.github+json" },
                cache: "no-store"
            }
        );

        if (!repoResponse.ok) {
            throw new Error("Your profile loaded, but GitHub could not provide the repository list right now.");
        }

        repositories = (await repoResponse.json()).filter(
            repo => !repo.archived && !repo.private
        );

        const languages = [...new Set(
            repositories.map(repo => repo.language).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        languageFilters.innerHTML = "";

        function addLanguageChip(language, label, count) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "filter-chip";
            button.dataset.language = language;
            button.setAttribute("aria-pressed", "false");

            if (language === selectedFilter) {
                button.classList.add("active");
                button.setAttribute("aria-pressed", "true");
            }

            const chipLanguages = language
                ? language.startsWith("[")
                    ? JSON.parse(language)
                    : [language]
                : [];

            if (chipLanguages.length) {
                const dot = document.createElement("i");
                dot.className = "dot";
                dot.setAttribute("aria-hidden", "true");
                dot.style.backgroundColor = getLanguageColor(chipLanguages[0]);
                button.appendChild(dot);
            }

            const text = document.createElement("span");
            text.textContent = `${label} (${count})`;
            button.appendChild(text);

            languageFilters.appendChild(button);
        }

        addLanguageChip("", "All languages", repositories.length);

        const languageGroups = [
            {
                label: "Web Development",
                languages: ["HTML", "CSS", "JavaScript", "TypeScript"]
            },
        ];

        languageGroups.forEach(group => {
            const availableLanguages = group.languages.filter(
                language => languages.includes(language)
            );

            if (!availableLanguages.length) return;

            const count = repositories.filter(
                repo => availableLanguages.includes(repo.language)
            ).length;

            addLanguageChip(
                JSON.stringify(availableLanguages),
                group.label,
                count
            );
        });

        languages.forEach(language => {
            if (["HTML", "CSS", "JavaScript"].includes(language)) return;

            const count = repositories.filter(
                repo => repo.language === language
            ).length;
            addLanguageChip(language, language, count);
        });

        renderRepositories();

    } catch (error) {
        document.querySelector("#profile-status").textContent =
            "Could not refresh live GitHub data.";

        notice.textContent = `${error.message} The page still links to github.com/${USERNAME}. If this continues, check your connection or GitHub API status.`;
        notice.classList.remove("hidden");

        if (!repositories.length) {
            grid.innerHTML = "";
            empty.textContent =
                "Repositories could not be loaded. Open the GitHub profile to view them.";
            empty.classList.remove("hidden");
        }
    }
}

search.addEventListener("input", renderRepositories);

languageFilters.addEventListener("click", event => {
    const button = event.target.closest(".filter-chip");
    if (!button) return;

    selectedFilter = button.dataset.language || "";

    languageFilters.querySelectorAll(".filter-chip").forEach(chip => {
        const active = chip === button;
        chip.classList.toggle("active", active);
        chip.setAttribute("aria-pressed", String(active));
    });

    renderRepositories();
});


loadPortfolio();