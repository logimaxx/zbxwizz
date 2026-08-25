class SheetsManager {
    /**
     *
     * @type {String[]}
     */
    #sheetsOrder = [];
    /**
     *
     * @type {{DataTable}}
     */
    sheets = {};
    lastAssignedIdx;
    #activeSheetName;
    #sheetsContainer;
    #tabsContainer;

    get s() {
        return this.sheets;
    }
    get sheetsNames() {
        return this.#sheetsOrder;
    }

    #sheetContainerTpl = `<div aria-labelledby="" style="display: none"></div>`;
    #sheetSelectorTabTpl = `<li class="nav-item mr-1" role="presentation">
<!--<div class="btn-group dropup btn-group-sm">-->
<!--  <button type="button" class="btn btn-danger">Action</button>-->
<!--  <button type="button" class="btn btn-danger dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-expanded="false">-->
<!--    <span class="sr-only">Toggle Dropdown</span>-->
<!--  </button>-->
<!--  <div class="dropdown-menu">-->
<!--    <a class="dropdown-item" href="#">Action</a>-->
<!--    <a class="dropdown-item" href="#">Another action</a>-->
<!--    <a class="dropdown-item" href="#">Something else here</a>-->
<!--    <div class="dropdown-divider"></div>-->
<!--    <a class="dropdown-item" href="#">Separated link</a>-->
<!--  </div>-->
<!--</div>-->

                    <a class="nav-link" ondblclick="edit_tab(this)" onclick="sheetManager.activate_sheet($(this).attr('data-sheet'))"></a>
                    </li>`;

    constructor(sheetsContainer, tabsContainer) {
        let self = this;
        this.#sheetsContainer = $(sheetsContainer).on("scroll",()=>{
            let sheet = self.get_active();
            if(!sheet) return;
            sheet.scrollY = self.#sheetsContainer.scrollTop();
            sheet.scrollX = self.#sheetsContainer.scrollLeft();
            sheet.schedule_virtual_update();
        });
        this.#tabsContainer = $(tabsContainer);
        $(window).on("resize", ()=>{
            let sheet = self.get_active();
            if(sheet) sheet.schedule_virtual_update();
        });
    }

    async init() {
        await appStorage.ready;
        await appStorage.migrateSheetsFromLocalStorage();

        let config;
        try {
            config = await appStorage.get("worksheets");
            config = config ? config : {};
        } catch (e) {
            log('No saved ws config');
            config = {};
        }

        this.lastAssignedIdx = config.lastAssignedIdx ? config.lastAssignedIdx : 0;

        this.#tabsContainer.empty();

        for (const sheetName of (config.sheets ? config.sheets : [])) {
            try {
                let wsData = await appStorage.get("sheet-"+sheetName + "-data");
                this.new_sheet(sheetName, wsData);
            } catch (e) {
                this.new_sheet(sheetName);
                log('Invalid sheet data', e);
            }
        }

        if(config.activeSheet) this.activate_sheet(config.activeSheet);
    }

    activate_sheet(sheetName) {
        try {
            // log("activate_sheet "+sheetName);
            const sheetId = this.sheets[sheetName].id;
            this.#sheetsContainer.children().hide();
            $("#sheetSelector").find("a.nav-link").removeClass("active");
            $("#"+sheetId).show();
            $("#"+sheetId+"-tab").addClass("active");
            if(this.#activeSheetName===sheetName) return ;
            this.#activeSheetName = sheetName;
            let activeSheet = this.get_active();

            if(activeSheet)
                this.#sheetsContainer.scrollTop(activeSheet.scrollY).scrollLeft(activeSheet.scrollX);
            //this.save(true);
            this.update_stats();
            if(activeSheet) activeSheet.schedule_virtual_update();
        }
        catch (e) {
            log(e)
        }
        
        return this.sheets[sheetName];

    }

    async save() {
        let cfg = {
            sheets: this.#sheetsOrder,
            lastAssignedIdx: this.lastAssignedIdx,
            activeSheet: this.#activeSheetName
        };
        await appStorage.set("worksheets", cfg);
        await Promise.all(Object.entries(this.sheets).map(([, sheet]) => sheet.save()));
    }

    update_stats() {
        try {
            let stats = this.get_active().get_stats();
            $("#totalRecs").text(stats.total);
            $("#totalSelected").text(stats.selected);
            $("#totalVisible").text(stats.visible);
        }
        catch(e) {
            //log(e);
        }
    }

    /**
     *
     * @param {String} wsId
     * @param {*} data
     * @returns
     */
    new(wsId, data = null) {
        return this.new_sheet(wsId, data);
    }

    /**
     * 
     * @param {String} sheetName 
     * @param {*} data 
     * @returns 
     */
    new_sheet(sheetName=null, data = null) {
        // log("New sheet",sheetName,data);
        if (!sheetName) {
            this.lastAssignedIdx++;
            sheetName = "sheet" + (this.lastAssignedIdx);
        }
        let container = $(this.#sheetContainerTpl).appendTo(this.#sheetsContainer);
        this.sheets[sheetName] = new Sheet(this,sheetName,container,10, data);
        const sheetId = this.sheets[sheetName].id;
        this.sheetsNames.push(sheetName);

        // create tab && anpass
        $(this.#sheetSelectorTabTpl).appendTo(this.#tabsContainer)
            .find("a")
            .text(sheetName)
            .attr("data-target", sheetId)
            .attr("data-sheet", sheetName)
            .attr("id", sheetId + "-tab");


        // create sheet container/pane
        
        
        this.activate_sheet(sheetName);
        save_session(true);
        return this.sheets[sheetName];
    }

    delete(sheetId) {
        return this.delete_sheet(sheetId);
    }
    /**
     *
     * @param sheetName
     * @returns {SheetsManager}
     */
    delete_sheet(sheetName) {
        if (!sheetName) {
            sheetName = this.#activeSheetName;
        }
        const sheetId = this.sheets[sheetName].id;
        // log("delete "+sheetId)

        this.sheets[sheetName].remove();
        delete this.sheets[sheetName];
        $("#"+sheetId+"-tab").parent().remove();
        this.reorder();
        this.save();
        log("new list",this.#sheetsOrder);

        const next = this.#sheetsOrder.length
            ? this.#sheetsOrder[this.#sheetsOrder.length - 1]
            : null;
        if (next) {
            this.activate_sheet(next);
        } else {
            this.#activeSheetName = null;
            this.update_stats();
        }

        return this;
    }

    /**
     *
     * @returns {Sheet}
     */
    get_active_sheet() {
        return this.sheets[this.#activeSheetName];
    }

    /**
     *
     * @returns {Sheet}
     */
    get_active() {
        return this.get_active_sheet();
    }
    get active_sheet() {
        return this.get_active_sheet();
    }

    reset() {
        this.lastAssignedIdx = 0;
        Object.keys(this.sheets).forEach(sheetName=>{
            const sheetId = this.sheets[sheetName].id;
            this.sheets[sheetName].remove();
            delete this.sheets[sheetName];
            this.#tabsContainer.find("li:has(#"+sheetId+"-tab)").remove();
        });
        this.#sheetsOrder = [];
        this.save();
        //window.location.reload();
    }
    rename(oldName,newName){
        return this.rename_sheet(oldName,newName);
    }

    rename_sheet(oldName,newName) {
        if(oldName!==newName && this.sheets[newName]) throw "Sheet "+newName+" already exists";
        log("RENAMING SHEET",oldName,newName,this)
        this.sheets[newName] = this.sheets[oldName];
        const sheetId = this.sheets[newName].id;
        this.sheets[newName].rename(newName);
        this.sheetsNames[this.sheetsNames.indexOf(oldName)] = newName;
        delete this.sheets[oldName];
        $("#"+sheetId+"-tab").text(newName).attr("data-sheet",newName);
        this.save();
        return this.activate_sheet(newName);
    }

    reorder() {
        let newOrder = [];
        $("#sheetSelector").find("a").toArray().forEach(a=>newOrder.push($(a).attr("data-sheet")));
        log("reorder",newOrder);
        this.#sheetsOrder = newOrder;
        this.save();
    }
}


function edit_tab(src) {
    function restore() {
        inp.remove();
            lnk.css("display","");
    }
    let lnk = $(src).css("display","none");
    let sheetName = lnk.text();
    function rename(event){
        let sheetNewName = inp.val();
        // log(event);
        if(event.code==="Escape") {
            restore();
            return;
        }
        if(event.code==="Enter" || event.code==="NumpadEnter") {
            // log(sheetNewName)
            if(sheetNewName==="")
                return;
            if(sheetNewName===sheetName)
                return restore();
            if(sheetManager.sheets[sheetNewName])
                return;
            // log("Perfom rename")
            restore();
            sheetManager.rename_sheet(sheetName,sheetNewName);
        }
    }
    let inp = $("<input>").val(sheetName).insertAfter(lnk)
        .trigger("focus")
        .on("blur",rename)
        .on("keyup",rename)
        .on("blur",restore);
}

$('#importCsvModal').on('show.bs.modal', function (event) {
    let sel = $(event.target).find("select").empty();
    $("<option>").val("").text("New sheet").appendTo(sel);
    Object.getOwnPropertyNames(sheetManager.sheets).forEach((name)=>{
        $("<option>").text(name).appendTo(sel);
    });
    const active = sheetManager.get_active();
    if(active) {
        sel.val(active.name);
    }
});