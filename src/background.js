let indexedColorMap   = new Array();
let indexedStateMap   = new Array();
let currentActiveTab  = null;
let pendingApplyColor = null;

/* Config and storage */

var configData = {
  enableBorder      : true,
  enableGradient    : false,
  enableAccent      : true,
  enableTabLine     : true,
  enableToolbarOverride : true,
  noReuseOldColor   : true,
  newTabColor       : '#ffffff',
  contentColorScheme : 'light',
  blocklistColors   : ''
}

function checkStoredSettings(item) {
  if (!item.configData) {
    browser.storage.local.set({configData});
  } else {
    configData = Object.assign({}, configData, item.configData);
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

var gettingItem = browser.storage.local.get();
gettingItem.then(checkStoredSettings, onError).then(() => {
  applyContentColorScheme();
  updateActiveTab();
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.configData) {
      configData = Object.assign({}, configData, changes.configData.newValue);
      applyContentColorScheme();
    }
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.kind === 'refresh') {
    browser.storage.local.get().then(checkStoredSettings, onError).then(() => {
      applyContentColorScheme();
      updateActiveTab();
    });
  }
});

function applyContentColorScheme() {
  if (!browser.browserSettings || !browser.browserSettings.overrideContentColorScheme) {
    return;
  }
  const value = configData.contentColorScheme || 'auto';
  browser.browserSettings.overrideContentColorScheme.set({ value }).catch(onError);
}

/* This is more aggressive override..*/
let isFirstRun = true;

const NEW_TAB_URLS = ['about:newtab', 'about:blank', 'about:home'];

function shouldSkipUrl(url) {
  if (!url) return false;
  const isNewTab = NEW_TAB_URLS.some(u => url.startsWith(u) || url === u);
  if (!isNewTab) return false;
  if (isFirstRun) {
    isFirstRun = false;
    return false;
  }
  return true;
}

function resetTheme() {
  browser.theme.reset();
}

function applyNewTabColor() {
  const hex = configData.newTabColor || '#ffffff';
  const rgb = util_hexToRgb(hex);
  if (!rgb) {
    resetTheme();
    return;
  }
  const color = { r: rgb.r, g: rgb.g, b: rgb.b, alpha: 255 };
  const themeProposal = util_themePackage(color);
  themeProposal.colors.tab_line = themeProposal.colors.frame;
  util_custom_update(themeProposal);
}

function updateActiveTab_pageloaded(tabId, changeInfo) {
      function updateTab(tabs) {
        if (tabs[0]) {
          var tabURLkey = tabs[0].url;
          if(shouldSkipUrl(tabURLkey)) {
            if (configData.noReuseOldColor) {
              applyNewTabColor();
            }
            return;
          }

          if(pendingApplyColor) {
            indexedStateMap[tabURLkey] = 3;
            pendingApplyColor = null;
          }

          if(indexedStateMap[tabURLkey] != 3 && changeInfo.status == 'complete') {
            currentActiveTab = tabURLkey;
            var capturing = browser.tabs.captureVisibleTab();
            capturing.then(onCaptured, onError);
          }
        }
      }
      var gettingActiveTab = browser.tabs.query({active: true, currentWindow: true});
      gettingActiveTab.then(updateTab);
}
function updateTab(tabs) {
    if (tabs[0]) {
      var tabURLkey = tabs[0].url;
      if(shouldSkipUrl(tabURLkey)) {
        if (configData.noReuseOldColor) {
          applyNewTabColor();
        }
        return;
      }
      if(pendingApplyColor) {
        indexedStateMap[tabURLkey] = 3;
        pendingApplyColor = null;
      }

      if(tabURLkey in indexedColorMap) {
        let colorObject = indexedColorMap[tabURLkey];

        let color = {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0
        };

        let themeProposal = util_themePackage(color);
        themeProposal.colors = colorObject;
        util_custom_update(themeProposal);

      } else {
        currentActiveTab = tabURLkey;
        var capturing = browser.tabs.captureVisibleTab();
        capturing.then(onCaptured, onError);
      }
    }
}

function updateActiveTab() {
    var gettingActiveTab = browser.tabs.query({active: true, currentWindow: true});
    gettingActiveTab.then(updateTab);
}

// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/captureVisibleTab
function onCaptured(imageUri) {
  let canvas = document.createElement('canvas');
  canvas.width  = 100;
  canvas.height = 100;
  canvasContext = canvas.getContext('2d');
  //canvasContext.scale(1 / window.devicePixelRatio, 1 / window.devicePixelRatio);
  let image = document.createElement('img');

  image.onload = function() {
    canvasContext.drawImage(image, 0,0);
    canvasData = canvasContext.getImageData(0, 0, 100, 10).data;
    canvasIndex = 710*4;

    let color = {
        r     : canvasData[canvasIndex],
         g    : canvasData[canvasIndex + 1],
          b   : canvasData[canvasIndex + 2],
        alpha : canvasData[canvasIndex + 3]
    };

    if (util_isColorBlocked(color.r, color.g, color.b)) {
      const fallback = util_hexToRgb(configData.newTabColor || '#f0f0f0');
      if (fallback) {
        color = { r: fallback.r, g: fallback.g, b: fallback.b, alpha: 255 };
      }
    }

    let themeProposal = util_themePackage(color);

    if(currentActiveTab) {
      indexedColorMap[currentActiveTab] = themeProposal.colors;
    }

    util_custom_update(themeProposal);
  }
  image.src=imageUri;
}

function onError(error) {
  console.log(`Error: ${error}`);
}

/*
   Utils
*/

function util_custom_update(themeProposal) {
  let themeProposal_copy = JSON.parse(JSON.stringify(themeProposal));
  if(!configData.enableBorder) {
    delete themeProposal_copy.colors.toolbar_bottom_separator;
    delete themeProposal_copy.colors.toolbar_top_separator;
    delete themeProposal_copy.colors.popup_border;
  }
  if(!configData.enableGradient) {
    delete themeProposal_copy.images;
    delete themeProposal_copy.properties;
  }
  if(!configData.enableAccent) {
    delete themeProposal_copy.colors.accentcolor;
  }
  if(!configData.enableToolbarOverride) {
    delete themeProposal_copy.colors.toolbar;
  }
  if(!configData.enableTabLine) {
    delete themeProposal_copy.colors.tab_line;
  }

  browser.theme.update(themeProposal_copy);
}

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function util_hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

const BLOCKLIST_TOLERANCE = 30;

function util_parseBlocklistColors(str) {
  if (!str || typeof str !== 'string') return [];
  return str.split(/[,\s]+/).map(s => s.trim()).filter(s => /^#?[a-f\d]{6}$/i.test(s));
}

function util_isColorBlocked(r, g, b) {
  const hexList = util_parseBlocklistColors(configData.blocklistColors);
  if (hexList.length === 0) return false;
  for (const hex of hexList) {
    const parsed = util_hexToRgb(hex);
    if (!parsed) continue;
    const diff = Math.abs(r - parsed.r) + Math.abs(g - parsed.g) + Math.abs(b - parsed.b);
    if (diff <= BLOCKLIST_TOLERANCE) return true;
  }
  return false;
}

function util_themePackage(color) {

  // http://stackoverflow.com/a/3943023/112731
  let textC = (color.r * 0.299 + color.g * 0.587 + color.b * 0.114) > 186 ? 0 : 255;
  let adjust = -25;

  const backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
  const dimmedBackgroundColor = `rgba(${color.r + adjust}, ${color.g + adjust}, ${color.b + adjust}, 1)`;
  const textColor = `rgb(${textC}, ${textC}, ${textC})`;
  const transparentTextColor = `rgba(${textC}, ${textC}, ${textC}, 0.25)`;
  const tabSelectedColor = textC === 0 ? backgroundColor : transparentTextColor;
  let colorObject = {
    bookmark_text: textColor,
    button_background_active: dimmedBackgroundColor,
    button_background_hover: backgroundColor,
    frame_inactive: backgroundColor,
    frame: backgroundColor,
    icons_attention: textColor,
    icons: textColor,
    ntp_background: backgroundColor,
    ntp_text: textColor,
    popup_border: backgroundColor,
    popup_highlight_text: dimmedBackgroundColor,
    popup_highlight: textColor,
    popup_text: textColor,
    popup: backgroundColor,
    sidebar_border: backgroundColor,
    sidebar_highlight_text: dimmedBackgroundColor,
    sidebar_highlight: textColor,
    sidebar_text: textColor,
    sidebar: backgroundColor,
    tab_background_separator: backgroundColor,
    tab_background_text: textColor,
    tab_line: dimmedBackgroundColor,
    tab_loading: textColor,
    tab_selected: tabSelectedColor,
    tab_text: textColor,
    toolbar_bottom_separator: backgroundColor,
    toolbar_field_border_focus: backgroundColor,
    toolbar_field_border: backgroundColor,
    toolbar_field_focus: backgroundColor,
    toolbar_field_highlight_text: textColor,
    toolbar_field_highlight: transparentTextColor,
    toolbar_field_text_focus: textColor,
    toolbar_field_text: textColor,
    toolbar_field: backgroundColor,
    toolbar_top_separator: backgroundColor,
    toolbar_vertical_separator: backgroundColor,
    toolbar: backgroundColor
  };


  let themeProposal = {
    colors : colorObject,
    images : {
      additional_backgrounds : [ "background.svg"]
    },
    properties: {
      additional_backgrounds_alignment : [ "top" ],
      additional_backgrounds_tiling    : [ "repeat"  ]
    }

  }

  return themeProposal;
}

/*
  Main exec functions

*/

browser.tabs.onUpdated.addListener(updateActiveTab_pageloaded);
browser.tabs.onActivated.addListener(updateActiveTab);
browser.windows.onFocusChanged.addListener(updateActiveTab);
