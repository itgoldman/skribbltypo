﻿// Only way to catch errors since: https://github.com/mknichel/javascript-errors#content-scripts. Paste in every script which should trace bugs.
window.onerror = (errorMsg, url, lineNumber, column, errorObj) => { if (!errorMsg) return; errors += "`❌` **" + (new Date()).toTimeString().substr(0, (new Date()).toTimeString().indexOf(" ")) + ": " + errorMsg + "**:\n" + ' Script: ' + url + ' \nLine: ' + lineNumber + ' \nColumn: ' + column + ' \nStackTrace: ' + errorObj + "\n\n"; }

// check if redirected from login
const loginRedirected = (new URLSearchParams(window.location.search)).get("login");
if (loginRedirected && loginRedirected.length > 0) {
    localStorage.member = '{"UserLogin":"' + loginRedirected + '"}';
    window.location.href = window.location.origin;
}

// execute inits when both DOM and palantir are loaded
const waitForDocAndPalantir = async () => {
    let palantirReady = false;
    let DOMready = false;
    return new Promise((resolve, reject) => {
        document.addEventListener("DOMContentLoaded", () => {
            DOMready = true;
            if (palantirReady) resolve(true);
        });
        document.addEventListener("palantirLoaded", () => {
            palantirReady = true;
            if (DOMready) resolve(true);
        });
        setTimeout(() => { reject(false); }, 20000);
    });
}
// await DOM load and palantir connection
(async () => {
    if (await waitForDocAndPalantir()) {
        await sprites.init(); // init sprites
        drops.initDrops(); // init drops
        if (localStorage.restrictLobby == "" && socket.data.user.member) {
            QS("#restrictLobby").dispatchEvent(new Event("click"));
        }
    }
    else alert("Error connecting to Palantir :/");
})().catch(console.error);
// init socket
setTimeout(async () => {
    lobbies.init();
    await socket.init();
}, 0);

visuals.init(); //init visual options popup

// inject patched game.js and modify elements that are immediately after page load visible
let patcher = new MutationObserver((mutations) => {
         mutations.forEach((mutation) => {
             mutation.addedNodes.forEach(async function (node) {
                if (localStorage.visualOptions && (node.tagName == "BODY" || node.tagName == "IMG")) { // head or image is loaded
                    // load current options
                    let opts = JSON.parse(localStorage.visualOptions);
                    visuals.applyOptions(opts);
                    // check if theme querystring is active
                    let name = (new URLSearchParams(window.location.search)).get("themename");
                    let theme = JSON.parse((new URLSearchParams(window.location.search)).get("theme"));
                    if (name && theme) {
                        window.history.pushState({}, document.title, "/");
                        if (visuals.themes.some(t => JSON.stringify(t.options) == JSON.stringify(theme))){
                            visuals.applyOptions(theme);
                            localStorage.visualOptions = JSON.stringify(theme);
                            setTimeout(() => new Toast("🥳 Activated theme " + name), 200);
                        }
                        else {
                            visuals.addTheme(name, theme);
                            visuals.applyOptions(theme);
                            localStorage.visualOptions = JSON.stringify(theme);
                            setTimeout(() => new Toast("🥳 Imported theme " + name), 200);
                        }
                    }
                }
                if (node.tagName == "SCRIPT" && node.src.includes("game.js")) {
                    // block game.js
                    node.type = "javascript/blocked"; // block for chrome
                    node.addEventListener("beforescriptexecute", e => e.preventDefault(), { once: true });
                    // insert patched script
                    let script = document.createElement("script");
                    script.src = chrome.extension.getURL("gamePatch.js");
                    node.parentElement.appendChild(script);
                    
                 }
                 if (node.classList && node.classList.contains("button-play")) {
                     node.insertAdjacentHTML("beforebegin", "<div id='typoUserInfo'>Connecting to Typo server...</div>");
                 }
                 if (node.parentElement?.classList.contains("panels") && node.tagName == "DIV" && node.classList.contains("panel") && !node.classList.contains("patched")) {
                     const panelGrid = elemFromString("<div id='panelgrid'></div>");
                     node.parentElement.insertBefore(panelGrid, node);
                     node.classList.add("patched");
                     const leftCard = elemFromString(`<div class='panel patched' > 
                        <div style="display:flex;height:100%;flex-direction:column;justify-content:space-between;" id="leftPanelContent">
                            <h2><span> Changelog</span><span>Typo News </span></h2>
                            <span>Typo is now compatible to the new skribbl.io update!</span><span>While many features were removed, the spirit stays the same <3 </span>
                            <div class="panel" style="width:unset; border:none !important; font-size:0.8em;"><b>BTW, did you know?</b>
                                <br>${hints[Math.floor(Math.random() * hints.length)]}
                            </div>
                            <div style="display: grid; grid-template-columns: 50% 50%;">
                                <typosocial media="discord"><a target="_blank" href='https://discord.link/typo'>Typo Discord</a></typosocial>
                                <typosocial media="website"><a target="_blank"  href='https://typo.rip'>Typo Website</a></typosocial>
                                <typosocial media="patreon"><a target="_blank"  href='https://patreon.com/skribbltypo'>Typo Patreon</a></typosocial>
                                <typosocial media="github"><a target="_blank"  href='https://github.com/toobeeh/skribbltypo'>Typo GitHub</a></typosocial>
                            </div>
                        </div>
                        </div>`);
                     let popupChanges = elemFromString(changelogRawHTML);
                     leftCard.querySelector("h2 span").addEventListener("click", () => {
                         new Modal(popupChanges, () => { }, "Changelog");
                         localStorage.lastChangelogview = chrome.runtime.getManifest().version;
                     });

                     const rightCard = elemFromString(`<div class='panel patched' >
                        <div style="display:flex;height:100%;flex-direction:column;justify-content:space-between;" id="rightPanelContent" class="lobbies">
                            <h2><span>Sprite Cabin </span><span> Lobbies</span></h2>
                            <div id="discordLobbies"></div>
                            <div id="cabinSlots" class="unauth">
                                <div id="loginRedir"><a href="https://tobeh.host/Orthanc/auth"><button class="flatUI air min blue">Log in with Palantir</button></a></div>
                                <div>Slot 1<p></p></div>
                                <div>Slot 2<p></p></div>
                                <div>Slot 3<p></p></div>
                                <div>Slot 4<p></p></div>
                                <div>Slot 5<p></p></div>
                                <div>Slot 6<p></p></div>
                                <div>Slot 7<p></p></div>
                                <div>Slot 8<p></p></div>
                                <div>Slot 9<p></p></div>
                            </div>
                        </div>
                        </div>`);
                     panelGrid.appendChild(leftCard);
                     panelGrid.appendChild(node);
                     panelGrid.appendChild(rightCard);
                     QS("#rightPanelContent h2").addEventListener("click", (event) => {
                         event.target.closest("#rightPanelContent").classList.toggle("cabin");
                         event.target.closest("#rightPanelContent").classList.toggle("lobbies");
                     });
                 }
            });
        });
});
patcher.observe(document, { attributes: false, childList: true, subtree: true });
