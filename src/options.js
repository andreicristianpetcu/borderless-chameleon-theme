
var configData = {
  enableBorder      : false,
  enableGradient    : false,
  enableAccent      : true,
  enableTabLine     : true,
  enableToolbarOverride : true,
  noReuseOldColor   : false,
  newTabColor       : '#ffffff',
  contentColorScheme: 'auto'
}

function checkStoredSettings(item) {
  if (!item.configData) {
    browser.storage.local.set({configData});
  } else {
    configData = Object.assign({}, configData, item.configData);
  }

  if(configData.enableBorder) {
    document.querySelector('#config_HTML_border').setAttribute('checked',configData.enableBorder);
  } else {
    document.querySelector('#config_HTML_border').removeAttribute('checked');
  }

  if(configData.enableTabLine) {
    document.querySelector('#config_HTML_tabline').setAttribute('checked',configData.enableTabLine);
  } else {
    document.querySelector('#config_HTML_tabline').removeAttribute('checked');
  }

  if(configData.enableGradient) {
    document.querySelector('#config_HTML_gradient').setAttribute('checked',configData.enableGradient);
  } else {
    document.querySelector('#config_HTML_gradient').removeAttribute('checked');
  }

  if(configData.enableAccent) {
    document.querySelector('#config_HTML_accent').setAttribute('checked',configData.enableAccent);
  } else {
    document.querySelector('#config_HTML_accent').removeAttribute('checked');
  }

  if(configData.enableToolbarOverride) {
    document.querySelector('#config_HTML_toolbar').setAttribute('checked',configData.enableToolbarOverride);
  } else {
    document.querySelector('#config_HTML_toolbar').removeAttribute('checked');
  }

  if(configData.noReuseOldColor) {
    document.querySelector('#config_HTML_no_reuse').setAttribute('checked',configData.noReuseOldColor);
  } else {
    document.querySelector('#config_HTML_no_reuse').removeAttribute('checked');
  }

  const newTabColorInput = document.querySelector('#config_HTML_new_tab_color');
  if (newTabColorInput && configData.newTabColor) {
    newTabColorInput.value = configData.newTabColor;
  }

  const contentSchemeSelect = document.querySelector('#config_HTML_content_color_scheme');
  if (contentSchemeSelect && configData.contentColorScheme) {
    contentSchemeSelect.value = configData.contentColorScheme;
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

var gettingItem = browser.storage.local.get();
gettingItem.then(checkStoredSettings, onError);

function updateSettings(e) {

  let dom_border_state   = document.getElementById('config_HTML_border').checked;
  let dom_gradient_state = document.getElementById('config_HTML_gradient').checked;
  let dom_tabline_state  = document.getElementById('config_HTML_tabline').checked;
  let dom_accent_state   = document.getElementById('config_HTML_accent').checked;
  let dom_toolbar_override_state  = document.getElementById('config_HTML_toolbar').checked;
  let dom_no_reuse_state   = document.getElementById('config_HTML_no_reuse').checked;
  let dom_new_tab_color    = document.getElementById('config_HTML_new_tab_color').value;
  let dom_content_scheme    = document.getElementById('config_HTML_content_color_scheme').value;

  configData.enableBorder   = dom_border_state;
  configData.enableGradient = dom_gradient_state;
  configData.enableTabLine  = dom_tabline_state;
  configData.enableAccent   = dom_accent_state;
  configData.enableToolbarOverride  = dom_toolbar_override_state;
  configData.noReuseOldColor   = dom_no_reuse_state;
  configData.newTabColor       = dom_new_tab_color;
  configData.contentColorScheme = dom_content_scheme;

  browser.storage.local.set({configData});

  var metaData = {
    kind  : 'refresh'
  }
  browser.runtime.sendMessage(metaData);
}

document.addEventListener('DOMContentLoaded',function() {
  document.querySelector('#config_HTML_border').onchange    = updateSettings;
  document.querySelector('#config_HTML_gradient').onchange  = updateSettings;
  document.querySelector('#config_HTML_tabline').onchange   = updateSettings;
  document.querySelector('#config_HTML_accent').onchange    = updateSettings;
  document.querySelector('#config_HTML_toolbar').onchange   = updateSettings;
  document.querySelector('#config_HTML_no_reuse').onchange   = updateSettings;
  document.querySelector('#config_HTML_new_tab_color').onchange = updateSettings;
  document.querySelector('#config_HTML_new_tab_color').oninput  = updateSettings;
  document.querySelector('#config_HTML_content_color_scheme').onchange = updateSettings;

},false);
