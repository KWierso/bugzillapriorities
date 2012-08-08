/* Set this to the REST API base URL for the API version you want */
//var apiRoot = "https://api-dev.bugzilla.mozilla.org/test/latest/"; // This runs on landfill bugzilla
var apiRoot = "https://api-dev.bugzilla.mozilla.org/latest/";

/* Set this to the product name for the product you want bugs for */
//var apiProduct = "FoodReplicator"; // This is a product on the landfill bugzilla
var apiProduct = "Add-on%20SDK";

/* On the API and product you want, we only want open bugs */
var bugURL = apiRoot + "bug?product=" + apiProduct + "&resolution=---";
//bugURL = bugURL + "&priority=--"; //Use for triage meeting

/* Send a request to get all open bugs in the product */
var request = new XMLHttpRequest();
request.open('GET', bugURL, true);
request.setRequestHeader("Accept", "application/json");
request.setRequestHeader("Content-Type", "application/json");
request.onreadystatechange = function (aEvt) {
  if (request.readyState == 4) {
    if(request.status == 200) {
      parseBugList(JSON.parse(request.response).bugs);
    } else {
      alert("Something with the request went wrong. Request status: " + request.status);
    }
  }
};
request.send(null);

/* 
  Take the list of bugs from the search, and fill in the 
  six lists of priorities
*/
function parseBugList(bugs) {
  /*
    Add the listener for the "Submit changes" button
  */
  var button = document.getElementById("changeBugs");
  button.addEventListener("click", function(ev) {
    var lis = document.getElementsByTagName("li");
    var changedBugs = [];
    for(i in lis) {
      if(lis[i].className == "movedNode") {
        changedBugs.push(lis[i]);
      }
    }
    updateBugs(changedBugs);
  }, false);

  /*
    Add the drag/drop listeners for the priority columns
  */
  var divs = document.getElementsByTagName("div");
  for(i in divs) {
    if(divs[i].className == "dropDiv") {
      divs[i].addEventListener("dragover", function(ev) {
        ev.preventDefault();
      }, false);
      
      divs[i].addEventListener("drop", function(ev) {
        ev.preventDefault();
        var data = ev.dataTransfer.getData("Text");
        var movedNode = document.getElementById(data);
        var target = ev.target;
        while(target.nodeName != "DIV") {
          target = target.parentNode;
        }
        
        if(movedNode.getAttribute("priority") == target.id) {
          movedNode.className = "";
          movedNode.removeAttribute("newpriority");
        } else {
          movedNode.className = "movedNode";
          movedNode.setAttribute("newpriority", target.id == "P0" ? "--" : target.id);
        }
        
        var ul = target.getElementsByTagName("ul")[0];
        try {
          ul.insertBefore(movedNode, ul.firstChild);
        } catch(e) {
          console.log(target);
        }
      }, false);
    }
  }

  /*
    For each bug, create a li element and add each of the bug's attributes to it.
    Also add the drag ability to each li element at this point.
  */
  for(i in bugs) {
    var thisBug = document.createElement("li");
    for(j in bugs[i]) {
      if(bugs[i][j] != "---" && bugs[i][j] != "") {
        if(bugs[i][j] == "[object Object]") {
          thisBug.setAttribute(j, bugs[i][j].name);
        } else {
          thisBug.setAttribute(j, bugs[i][j]);
        }
      }
    }
    thisBug.textContent = thisBug.getAttribute("id");
    thisBug.setAttribute("draggable", "true");
    
    thisBug.addEventListener("dragstart", function(ev) {
      ev.dataTransfer.setData("Text", ev.target.getAttribute("id"));
    }, false);
    
    var priority = thisBug.getAttribute("priority");
    if(priority == "--") {
      priority = "P0";
    }

    /*
      When a li element is clicked, show information about this bug
      off to the side of the page.
    */
    thisBug.addEventListener("click", function(evt) {
      var clickedBug = evt.target;
      var lis = document.getElementsByTagName("li");
      for(k in lis) {
        try {
          lis[k].removeAttribute("focused");
        } catch(e) {}
      }
      clickedBug.setAttribute("focused", "true");

      var bugDescription = document.getElementById("bugDescription")
      bugDescription.setAttribute("active", "true");
      
      while(bugDescription.hasChildNodes()) {
        bugDescription.removeChild(bugDescription.firstChild);
      }
      
      createDescription("Bug ", clickedBug.getAttribute("id"));
      createDescription("Summary: ", clickedBug.getAttribute("summary"));
      createDescription("Reported by: ", clickedBug.getAttribute("creator"));
      createDescription("Assigned to: ", clickedBug.getAttribute("assigned_to"));
      createDescription("Status: ", clickedBug.getAttribute("status"));
      createDescription("Priority: ", clickedBug.getAttribute("priority"));
      createDescription("Severity: ", clickedBug.getAttribute("severity"));
      createDescription("Product: ", clickedBug.getAttribute("product"));
      createDescription("Component: ", clickedBug.getAttribute("component"));
      if(clickedBug.getAttribute("whiteboard") != null) {
        createDescription("Whiteboard: ", clickedBug.getAttribute("whiteboard"));
      }
    }, false);

    document.getElementById(priority).getElementsByTagName("ul")[0].appendChild(thisBug);
  }
}

/*
  Add a row to the bug's description for each name/value pair
*/
function createDescription(name, value) {
  var newDiv = document.createElement("div");
  var newNameSpan = document.createElement("span");
  var newValueSpan = document.createElement("span");
  
  newNameSpan.textContent = name;
  newValueSpan.textContent = value;
  
  newDiv.appendChild(newNameSpan);
  newDiv.appendChild(newValueSpan);
  
  document.getElementById("bugDescription").appendChild(newDiv);
}

/*
  When the user clicks the Submit button, request each individual changed bug's information
  in order to get the update_token field, then PUT the changed priority into the bug using that token.
*/
function updateBugs(changedBugs) {
  if(window.confirm("This will make permanent changes to the bug database, are you sure you want to do that?")) {
    for(i in changedBugs) {
      getUpdatedBug(changedBugs[i])
    }
  }
}

function getUpdatedBug(thisBug) {
  var authstring = "username=" + document.getElementById("user").value + "&password=" + document.getElementById("pass").value;
  var getURL = apiRoot + "bug/" + thisBug.id + "?include_fields=update_token,id,priority&" + authstring;
  var getRequest = new XMLHttpRequest();
  getRequest.open('GET', getURL, true);
  getRequest.setRequestHeader("Accept", "application/json");
  getRequest.setRequestHeader("Content-Type", "application/json");
  getRequest.onreadystatechange = function (aEvt) {
    if (getRequest.readyState == 4) {
      if(getRequest.status == 200) {
      //console.log(getRequest.response);
        var bug = JSON.parse(getRequest.response);
        try {
          //console.log(thisBug.id + " " + bug.id);
          putUpdatedBug(thisBug, bug);
        } catch(e) {
          console.log(e);
        }
    } else {
        //alert("Something with the request went wrong. Request status: " + getRequest.status);
      }
    }
  };
  getRequest.send(null);
}

function putUpdatedBug(thisBug, bug) {
  var authstring = "username=" + document.getElementById("user").value + "&password=" + document.getElementById("pass").value;
  var putURL = apiRoot + "bug/" + thisBug.id + "?" + authstring;
  var putRequest = new XMLHttpRequest();
  putRequest.open('PUT', putURL, true);
  putRequest.setRequestHeader("Accept", "application/json");
  putRequest.setRequestHeader("Content-Type", "application/json");
  putRequest.onreadystatechange = function (aEvt) {
    if (putRequest.readyState == 4) {
      if(putRequest.status == 202) {
        if(JSON.parse(putRequest.response).ok) {
        //alert(this);
          thisBug.removeAttribute("class");
          thisBug.setAttribute("priority", bug.priority)
        }
      } else {
        //alert(putRequest.response);
      }
    }
  }
  bug.priority = thisBug.getAttribute("newpriority");
  if(bug.priority == "P0") {
    bug.priority = "--";
  }
  //console.log(JSON.stringify(bug));
  //alert(getRequest.response + "\n" + JSON.stringify(bug));
  putRequest.send(JSON.stringify(bug));
}
