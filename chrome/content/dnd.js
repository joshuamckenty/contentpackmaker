// This file may be used under the terms of of the
// GNU General Public License Version 2 or later (the "GPL"),
// http://www.gnu.org/licenses/gpl.html
//
// Software distributed under the License is distributed on an "AS IS" basis,
// WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
// for the specific language governing rights and limitations under the
// License.


var cp_mediaDragObserver = {

  onDragStart: function(event, transferData, action) {
    var item = event.target; 
    while (item && item.tagName != "hbox") {
      item = item.parentNode; 
    }
    // alert("JMC: adding flavour for " + item.id + "\n");
    transferData.data=new TransferData();
    transferData.data.addDataForFlavour("moz/rdfitem", item.id);
  }
}

var cp_dnd = {

  canHandleMultipleItems: true,
  onDragOver: function(event, aFlavor, aSession) {
   dump("OnDragOver");
  },
  onDrop: function(aEvent, aDropData, aSession) {
    aEvent.stopPropagation();
    for (var c = 0; c < aDropData.dataList.length; c++) {
      var contentType = aDropData.dataList[c].dataList[0].flavour.contentType;
      switch (contentType) {
        case "flock/richtreeitem":
        case "moz/rdfitem":
        case "text/x-moz-url":
          var uri = aDropData.dataList[c].dataList[0].data;
          cp_controller.add_url_to_manifest(uri);
          break;
        case "application/x-moz-file":
          var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath( aDropData.dataList[c].dataList[0].data.path );
            cp_controller.receive_file(file);
          break;
        default:
          alert('add handler for: ' + contentType);
          break;
      }
    }
  },

  getSupportedFlavours: function() {
    var flavors = new FlavourSet();
    flavors.appendFlavour("flock/richtreeitem");
    flavors.appendFlavour("moz/rdfitem");
    flavors.appendFlavour("application/x-moz-file", "nsIFile");
    return flavors;
  }
}


