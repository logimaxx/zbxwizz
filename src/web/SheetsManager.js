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
    #tabMenu;
    #tabMenuSheet = null;

    get s() {
        return this.sheets;
    }
    get sheetsNames() {
        return this.#sheetsOrder;
    }

    #sheetContainerTpl = `<div aria-labelledby="" style="display: none"></div>`;
    #sheetSelectorTabTpl = `<li class="nav-item mr-1" role="presentation">
                    <div class="sheet-tab">
                        <a class="nav-link" href="#" role="tab"></a>
                        <button type="button" class="sheet-tab-toggle" title="Sheet menu" aria-label="Sheet menu" aria-haspopup="true">
                            <i class="fa fa-caret-up"></i>
                        </button>
                    </div>
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

        this.#tabMenu = $(`<div id="sheetTabMenu" class="dropdown-menu" role="menu">
            <a class="dropdown-item" href="#" data-action="rename" role="menuitem">Rename</a>
            <a class="dropdown-item" href="#" data-action="duplicate" role="menuitem">Duplicate</a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item text-danger" href="#" data-action="delete" role="menuitem">Delete</a>
        </div>`).appendTo(document.body);

        this.#tabsContainer
            .on("click", "a.nav-link", (e) => {
                e.preventDefault();
                this.activate_sheet($(e.currentTarget).attr("data-sheet"));
            })
            .on("click", ".sheet-tab-toggle", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const $a = $(e.currentTarget).closest(".sheet-tab").find("a.nav-link");
                const sheetName = $a.attr("data-sheet");
                if (!sheetName) return;
                this.activate_sheet(sheetName);
                this.show_tab_menu(sheetName, e.currentTarget);
            })
            .on("contextmenu", ".sheet-tab", (e) => {
                e.preventDefault();
                const $a = $(e.currentTarget).find("a.nav-link");
                const sheetName = $a.attr("data-sheet");
                if (!sheetName) return;
                this.activate_sheet(sheetName);
                this.show_tab_menu(sheetName, null, e.clientX, e.clientY);
            });

        this.#tabMenu.on("click", "a.dropdown-item", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const action = $(e.currentTarget).attr("data-action");
            const sheetName = this.#tabMenuSheet;
            this.hide_tab_menu();
            if (!sheetName || !this.sheets[sheetName]) return;
            if (action === "rename") {
                const tab = this.#find_tab_link(sheetName);
                if (tab) edit_tab(tab);
            } else if (action === "duplicate") {
                this.duplicate_sheet(sheetName);
            } else if (action === "delete") {
                this.delete_sheet(sheetName);
            }
        });

        $(document).on("click.sheetTabMenu", (e) => {
            if (!$(e.target).closest("#sheetTabMenu, .sheet-tab-toggle").length) {
                this.hide_tab_menu();
            }
        });
        $(window).on("resize.sheetTabMenu scroll.sheetTabMenu", () => this.hide_tab_menu());
    }

    #find_tab_link(sheetName) {
        return this.#tabsContainer.find("a.nav-link").filter(function () {
            return $(this).attr("data-sheet") === sheetName;
        })[0] || null;
    }

    show_tab_menu(sheetName, anchorEl, x, y) {
        this.#tabMenuSheet = sheetName;
        const menu = this.#tabMenu.addClass("show").css({ left: 0, top: 0, visibility: "hidden" });
        const mw = menu.outerWidth();
        const mh = menu.outerHeight();

        if (anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            x = rect.right - mw;
            y = rect.top - mh - 4;
            if (y < 4) y = rect.bottom + 4;
        } else {
            x = x || 0;
            y = y || 0;
        }

        x = Math.max(4, Math.min(x, window.innerWidth - mw - 8));
        y = Math.max(4, Math.min(y, window.innerHeight - mh - 8));
        menu.css({ left: x + "px", top: y + "px", visibility: "visible" });
    }

    hide_tab_menu() {
        this.#tabMenuSheet = null;
        this.#tabMenu.removeClass("show").css({ visibility: "" });
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
            $("#sheetSelector").find(".sheet-tab").removeClass("active");
            $("#"+sheetId).show();
            $("#"+sheetId+"-tab").addClass("active").closest(".sheet-tab").addClass("active");
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
            .find("a.nav-link")
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
        if (!sheetName || !this.sheets[sheetName]) {
            return this;
        }
        this.hide_tab_menu();
        const sheetId = this.sheets[sheetName].id;
        // log("delete "+sheetId)

        this.sheets[sheetName].remove();
        delete this.sheets[sheetName];
        $("#"+sheetId+"-tab").closest("li").remove();
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
     * Clone a sheet (fields + all rows) into a new uniquely named sheet.
     * @param {String} sheetName
     * @returns {Sheet}
     */
    duplicate_sheet(sheetName) {
        const sheet = this.sheets[sheetName];
        if (!sheet) return null;

        let base = sheetName + " copy";
        let name = base;
        let n = 2;
        while (this.sheets[name]) {
            name = base + " " + n;
            n++;
        }

        return this.new_sheet(name, {
            fields: sheet.fields.slice(),
            records: sheet.export()
        });
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
        $("#sheetSelector").find("a.nav-link[data-sheet]").toArray().forEach(a=>newOrder.push($(a).attr("data-sheet")));
        log("reorder",newOrder);
        this.#sheetsOrder = newOrder;
        this.save();
    }
}


function edit_tab(src) {
    let lnk = $(src);
    let $toggle = lnk.closest(".sheet-tab").find(".sheet-tab-toggle").hide();
    let sheetName = lnk.attr("data-sheet") || lnk.text();
    function restore() {
        inp.remove();
        lnk.css("display", "");
        $toggle.show();
    }
    lnk.css("display", "none");
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
    let inp = $("<input class=\"sheet-tab-rename-input\">").val(sheetName).insertAfter(lnk)
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
