function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

document.addEventListener("DOMContentLoaded", function () {
  const mainTabButton = document.getElementById("mainTab");
  const rulesTabButton = document.getElementById("rulesTab");
  const addProxyTabButton = document.getElementById("addProxyTab");

  mainTabButton.addEventListener("click", function (event) {
    openTab(event, "Main");
  });

  rulesTabButton.addEventListener("click", function (event) {
    openTab(event, "Rules");
  });

  addProxyTabButton.addEventListener("click", function (event) {
    openTab(event, "AddProxy");
  });

  document.getElementById("mainTab").click();
});
