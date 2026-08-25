class Row {
    /**
     * @type {jquery}
     */
    #el;
    /**
     *
     * @type {(Cell)[]}
     */
    #cells = [];
    #cellsByFld = {};
    /**
     *  @type {Sheet}
     */
    #table;
    /**
     *
     * @type {Array}
     */
    #filtercols = [];

    /**
     *
     * @type {boolean}
     */
    hasError = false;

    lastError = null;
    /**
     * @type {number}
     */
    #rowIdx;
    data = {};
    #cellsData;
    lastResponse = null;

    #selected = false;
    #hidden = false;
    #mounted = false;
    #statusClass = "";

    #rowMenu = `<a class="dropdown-item" role='button'  href='#' data-row-action="info">Row info</a>`+
        '<a class="dropdown-item" role="button"  href="#" data-row-action="duplicate">Duplicate row</a>' +
        '<a class="dropdown-item" role="button"  href="#" data-row-action="delete">Delete row</a>' +
        '<a class="dropdown-item" role="button"  href="#" data-row-action="insert-before">Insert empty row before</a>'+
        '<a class="dropdown-item" role="button"  href="#" data-row-action="insert-after">Insert empty row after</a>'
        ;

    #btnCellTpl = `<button class="row-menu-btn btn btn-sm btn-outline-secondary dropdown-toggle" type="button" role="button" data-toggle="dropdown" aria-expanded="false" title="Row menu">Menu</button><div class="dropdown-menu dropdown"></div>`;

    #bindRowMenu($menu) {
        const row = this;
        $menu.off("click.rowMenu").on("click.rowMenu", "[data-row-action]", (e) => {
            e.preventDefault();
            const action = $(e.currentTarget).attr("data-row-action");
            if (action === "info") row.info();
            else if (action === "duplicate") row.duplicate();
            else if (action === "delete") confirm_modal("Are you sure you want to delete this record?", () => row.delete());
            else if (action === "insert-before") row.insert("before");
            else if (action === "insert-after") row.insert("after");
            const owner = $menu.data("rowMenuOwner");
            if (owner) $(owner).find(".dropdown-toggle").dropdown("hide");
            else $menu.removeClass("show");
        });
    }
    hide(){
        if(this.#hidden) return;
        this.#hidden = true;
        this.#table.on_row_visibility_changed();
    }
    show(){
        if(!this.#hidden) return;
        this.#hidden = false;
        this.#table.on_row_visibility_changed();
    }

    /**
     * creates a row data object with all the data in the row to be used in scripts like transform_cell, pull, push, etc.
     * @returns {Object}
     */
    get script_data() {
        let data = {
            data: Object.assign({},this.data),
            cols: this.vals.concat([]),
            flds: Object.assign(this.fld_vals)
        };
        this.vals.forEach((v,idx)=>{
            data["$"+idx] = v;
        });
        Object.keys(this.fld_vals).forEach(k=>{
            data["_"+k]=this.fld_vals[k];
        });
        return data;
    }

    /**
     *
     * @returns {boolean}
     */
    get is_hidden(){
        return this.#hidden;
    }

    /**
     *
     * @returns {boolean}
     */
    get isHidden() {
        return this.#hidden;
    }

    get isMounted() {
        return this.#mounted;
    }

    /**
     *
     */
    toJSON() {
        return JSON.stringify(this.cells);
    }

    /**
     *
     * @returns {jquery}
     */
    get $el(){
        return this.#el;
    }

    set highlight(state) {
        if(!this.#el) return;
        if(state) this.#el.addClass("highlight");
        else  this.#el.removeClass("highlight");
    }

    /**
     *
     * @param {String|number} col
     */
    filter_in(col) {
        let idx = this.#filtercols.indexOf(col);
        if(idx!==-1)
            this.#filtercols.splice(idx,1);
        // log(this,this.#filtercols);
        if(this.#filtercols.length===0)
            this.show();
    }

    /**
     *
     * @param {String|number} col
     */
    filter_out(col) {
        if(this.#filtercols.length===0) {
            this.hide();
            this.#filtercols.push(col);
            return;
        }
        let idx = this.#filtercols.indexOf(col);
        if(idx===-1)
            this.#filtercols.push(col);
    }

    /**
     *
     * @param cell
     * @returns {number}
     */
    cell_coll(cell) {
        return this.#cells.indexOf(cell);
    }

    /**
     * @returns {Sheet}
     */
    get table() {
        return this.#table;
    }

    /**
     * @returns {Object}
     */
    get fld_vals() {
        let resp = {};
        // log(this.#cellsByFld);
        Object.keys(this.#cellsByFld).forEach((key)=>resp[key]=this.#cellsByFld[key].val);
        return resp;
    }
    /**
     *
     * @returns {(String)[]}
     */
    get vals() {
        return this.#cells.map(cell=>cell.val);
    }

    val(fld) {
        return this.#cellsByFld[fld].val;
    }

    /**
     *
     * @returns {Cell[]}
     */
    get cells(){
        return this.#cells;
    }

    /**
     *
     * @param idf
     * @returns {Cell}
     */
    cell(idf) {
        
        if(typeof idf==="number") {
            return this.#cells[idf];
        }
        else if(typeof idf==="string") {
            return this.#cellsByFld[idf];
        }
        else {
            throw "Invalid cell id: "+idf;
        }
    }


    /**
     *
     * @param newName
     * @param idx
     * @returns {Row}
     */
    rename_cell(newName,idx){
        if(this.#cellsByFld[newName]) {
            throw "Column name "+newName+" is already used";
        }
        let cell = this.#cells[idx];
        let oldName = cell.fld;
        cell.fld = newName;
        this.#cellsByFld[newName] = cell;
        delete this.#cellsByFld[oldName];
        return this;
    }

    select(checked=null,bulkUpdate = false) {
        if(checked!==null) {
            this.#selected = !!checked;
        }
        else if(this.#el) {
            this.#selected = this.#el.find("input[type=checkbox]")[0].checked;
        }

        if(this.#el) {
            this.#el.find("input[type=checkbox]")[0].checked = this.#selected;
            if(this.#selected) {
                this.#el.addClass("selected");
            }
            else {
                this.#el.removeClass("selected");
            }
        }
        if(!bulkUpdate)
            sheetManager.update_stats();
    }


    /**
     * @return boolean
     */
    get isSelected() {
        return this.#selected;
    }

    get idx() {
        return this.#rowIdx;
    }

    delete() {
        this.#table.delete_row(this.#rowIdx);
        this.unmount();
        this.#table.update_stats();
        save_session(true);
    }

    insert(where) {
        this.#table.insert_row(this.#rowIdx,where);
        this.#table.update_stats();
    }
    duplicate() {
        this.#table.duplicate_row(this);
        this.#table.update_stats();
    }

    /**
     *
     */
    info() {
        let data = this.export();
        data.cols = this.cells.map(cell=>cell.val);
        data.lastResponse = this.lastResponse;
        data.lastError = this.lastError;
        let body = $("<div style='width: 100%; height: 100%'>");
        let editor = new JSONEditor($(body)[0], {
            mode: 'code'
        });
        editor.setText(JSON.stringify(data,null,4));
        dragable_modal({
            body: body,
            title: "Row data",
            attrs:{
                style: "width: 600px; height: 500px;"
            }
        });
    }

    /**
     * 
     * @param {Sheet} dataTable 
     * @param {number} rowIdx 
     * @param {Array} fields 
     * @param {Object} record 
     */
    constructor(dataTable,rowIdx,fields,record) {
        this.#rowIdx = rowIdx;
        this.#table = dataTable;
        Object.assign(this.data,record.data ?  record.data  : {});
        if(!record.flds || !Object.keys(record.flds).length) {
            record.flds = {};
            fields.forEach(fld=>record.flds[fld]=null);
        }
        this.data.csv = record.flds;
        this.load_data(fields,record.flds);
    }

    /**
     * Build / refresh the row DOM (does not attach to tbody — Sheet virtualizer does).
     * @returns {jquery}
     */
    mount() {
        if(!this.#el) {
            this.#el = $("<tr class='virt-row'>").data("rowRef",this);
        }
        this.render();
        this.#mounted = true;
        return this.#el;
    }

    /**
     * Remove row DOM and free cell nodes.
     */
    unmount() {
        if(!this.#mounted && !this.#el) return;
        this.#cells.forEach(cell=>cell.unmount());
        if(this.#el) {
            this.#el.remove();
            this.#el = null;
        }
        this.#mounted = false;
    }

    /**
     * show row as loading
     */
    set_loading() {
        this.#statusClass = "loading";
        if(this.#el) this.#el.removeClass("error success").addClass("loading");
    }

    /**
     * return row data as an object
     * @returns {{}}
     */
    get cellsData() {
        return this.#cells.reduce((acc,c)=>{
            acc[c.fld] = c.val;
            return acc;
        },{});
    }

    /**
     * show row as having errors (add error class)
     * @param err
     */
    set_error(err) {
        this.#statusClass = "error";
        this.lastError = err;
        this.hasError = true;
        if(this.#el) this.#el.removeClass("success loading").addClass("error");
    }

    /**
     * clear row error
     */
    unset_error() {
        this.#statusClass = "";
        this.hasError = false;
        if(this.#el) this.#el.removeClass("error success loading");
    }

    /**
     * show row as successful
     */
    set_success() {
        this.#statusClass = "success";
        this.hasError = false;
        this.lastError = null;
        if(this.#el) this.#el.removeClass("error loading").addClass("success");
    }

    /**
     *
     */
    unset_loading() {
        if(this.#statusClass === "loading") this.#statusClass = "";
        if(this.#el) this.#el.removeClass("loading");
        return this;
    }
    /**
     *
     * @param fields
     * @param record
     */
    load_data(fields,record) {
        this.#cells.forEach(cell=>cell.unmount());
        this.#cellsData = record;
        this.#cells=[];
        this.#cellsByFld = {};
        fields.forEach((fld,colIdx)=>{
            let raw = record[fld];
            let cell = new Cell(this,colIdx,fld,(raw != null ? raw : "").toString());
            this.#cells.push(cell);
            this.#cellsByFld[fld] = cell;
        });
        return this;
    }

    render() {
        let self = this;
        if(!this.#el) {
            this.#el = $("<tr class='virt-row'>").data("rowRef",this);
        }
        this.#el.empty()
            .removeClass("selected loading error success highlight")
            .toggleClass("selected", this.#selected);
        if(this.#statusClass) this.#el.addClass(this.#statusClass);

        $("<td>").appendTo(this.#el).append($("<div class=\"input-group-text\"><input type=\"checkbox\"></div>").find("input")
            .prop("checked", this.#selected)
            .on("change",()=>self.select()));
        let menuCell = $("<td class='dropright dropdown'>").appendTo(this.#el)
            .append(this.#btnCellTpl);

        let tpl = this.#rowMenu;
        const row = this;
        menuCell.find("button").text(this.#rowIdx).parent()
            .on("show.bs.dropdown", (event) => {
                const $cell = $(event.target);
                $cell.closest("tr").addClass("row-menu-open");
                const $menu = $cell.children(".dropdown-menu").empty().append(tpl);
                row.#bindRowMenu($menu);
            })
            .on("shown.bs.dropdown", (event) => {
                const $cell = $(event.target);
                const $btn = $cell.children(".dropdown-toggle");
                const $menu = $cell.children(".dropdown-menu");
                if (!$menu.length) return;
                const rect = $btn[0].getBoundingClientRect();
                $menu
                    .data("rowMenuOwner", $cell)
                    .appendTo(document.body)
                    .addClass("row-menu-floating show")
                    .css({
                        position: "fixed",
                        top: Math.min(rect.top, window.innerHeight - $menu.outerHeight() - 8) + "px",
                        left: Math.min(rect.right + 2, window.innerWidth - $menu.outerWidth() - 8) + "px",
                        transform: "none",
                        zIndex: 3000
                    });
            })
            .on("hide.bs.dropdown", (event) => {
                const $cell = $(event.target);
                const $floating = $("body > .dropdown-menu.row-menu-floating").filter((_, el) => {
                    const owner = $(el).data("rowMenuOwner");
                    return owner && $(owner).is($cell);
                });
                if ($floating.length) {
                    $floating
                        .removeClass("row-menu-floating show")
                        .css({ position: "", top: "", left: "", transform: "", zIndex: "" })
                        .removeData("rowMenuOwner")
                        .appendTo($cell);
                }
                $cell.closest("tr").removeClass("row-menu-open");
            });

        this.#cells.forEach(cell=>cell.render().appendTo(this.#el));
        this.#mounted = true;
        return this.#el;
    }

    /**
     *
     * @returns {{flds: {}}}
     */
    export(columns=null) {
        let data = {flds:{}};
        this.#cells.forEach((cell)=>{
            if(!columns || columns.includes(cell.fld)) {
                data.flds[cell.fld]=cell.val;
            }
        });
        data.data = this.data;
        return data;
    }

    /**
     *
     */
    remove() {
        this.#table.remove_row(this.#rowIdx);
        this.#table.schedule_virtual_update();
    }
    renumber(idx) {
        this.#rowIdx = idx;
        if(this.#el) this.#el.find("button").text(idx);
        return this;
    }
}
