import {h} from 'maquette';
import * as Langs from '../definitions/languages'; 
import * as Graph from '../definitions/graph'; 
import * as Values from '../definitions/values'; 
import {printPreview} from '../editors/preview'; 
import {createEditor} from '../editors/editor';
import {Md5} from 'ts-md5';
import axios from 'axios';

declare var DATASTORE_URI: string;

// ------------------------------------------------------------------------------------------------
// rPython plugin
// ------------------------------------------------------------------------------------------------

/// A class that represents a Python block. All blocks need to have 
/// `language` and Python also keeps the Python source we edit and render


export class ExternalBlockKind implements Langs.Block {
        language : string;
        source : string;
        constructor(source:string, language: string) {
            this.language = language;
            this.source = source;
        }
    }

export interface ExternalSwitchTabEvent {
    kind: "switchtab"
    index: number
}

export type ExternalEvent = ExternalSwitchTabEvent 

export type ExternalState = {
    id: number
    block: ExternalBlockKind
    tabID: number
}


export const ExternalEditor : Langs.Editor<ExternalState, ExternalEvent> = {
    
    initialize: (id:number, block:Langs.Block) => {  
        return { id: id, block: <ExternalBlockKind>block, tabID: 0}
    },

    update: (state:ExternalState, event:ExternalEvent) => {
        switch(event.kind) {
            case 'switchtab':
            {
                return { id: state.id, block: state.block, tabID: event.index }
            }
        }
        return state	
    },

    render: (cell: Langs.BlockState, state:ExternalState, context:Langs.EditorContext<ExternalEvent>) => {
        let previewButton = h('button', { onclick:() => context.evaluate(cell) }, ["Preview"])
        let triggerSelect = (t:number) => context.trigger({kind:'switchtab', index: t})
        let preview = h('div', {}, [(cell.code.value==undefined) ? previewButton : (printPreview(triggerSelect, state.tabID, <Values.DataFrame>cell.code.value))]);
        let code = createEditor(cell.code.language, state.block.source, cell, context)
        return h('div', { }, [code, preview])
    }
}

export class externalLanguagePlugin implements Langs.LanguagePlugin {
  readonly language: string;
  readonly editor: Langs.Editor<ExternalState, ExternalEvent>;
  readonly serviceURI: string;

  constructor(l: string, uri: string) {
    this.language = l;
    this.serviceURI = uri;
    this.editor = ExternalEditor;
    console.log("Constructor: " +this.language+ ": "+this.serviceURI)
  }

  async evaluate(node:Graph.Node) : Promise<Values.Value> {
    let externalNode = <Graph.ExternalNode>node
  
    async function getValue(blob) : Promise<Values.Value> {
      var pathname = new URL(blob).pathname;
      let headers = {'Content-Type': 'application/json'}
      let url = DATASTORE_URI.concat(pathname)
      try {
          let response = await axios.get(url, {headers: headers});
          return response.data
      }
      catch (error) {
          console.error(error);
      }
    }
  
    async function getEval(body, serviceURI ) : Promise<Values.ExportsValue> {
      let url = serviceURI.concat("/eval")
      console.log("Eval at:" + url);
      let headers = {'Content-Type': 'application/json'}
      try {
        let response = await axios.post(url, body, {headers: headers});
        console.log(response);
        var results : Values.ExportsValue = {}
        for(var df of response.data.frames) 
        // results[df.name] = await getValue(df.url)
        results[df.name] = {url: df.url, data: await getValue(df.url)}
        return results;
      }
      catch (error) {
          console.error(error);
      }
    }
  
    switch(externalNode.kind) {
      case 'code': 
        let importedFrames : { name:string, url:string }[] = [];
        for (var ant of externalNode.antecedents) {
          let imported = <Graph.ExportNode>ant
          importedFrames.push({ name: imported.variableName, url: (<Values.DataFrame>imported.value).url })
        }
        let src = externalNode.source
        let hash = Md5.hashStr(src)
        let body = {"code": src,
                        "hash": hash,
                        "frames": importedFrames}
        return await getEval(body, this.serviceURI);
      case 'export':
        let exportNode = <Graph.ExternalExportNode>node
        let exportNodeName= exportNode.variableName
        let exportsValue = <Values.ExportsValue>exportNode.code.value
        return exportsValue[exportNodeName]
    }
  }

  parse (code:string) {	
    return new ExternalBlockKind(code, this.language);
  }

  bind (scopeDictionary: Langs.ScopeDictionary, block: Langs.Block) {
    let exBlock = <ExternalBlockKind>block
    let dependencies:Graph.ExternalExportNode[] = [];
    let node:Graph.ExternalCodeNode = {
        language:this.language, 
        antecedents:[],
        exportedVariables:[],
        kind: 'code',
        value: undefined,
        source: exBlock.source
    }
    let url = this.serviceURI.concat("/exports")
    console.log("Exporting to: "+url)
    let hash = Md5.hashStr(exBlock.source)
    let body = {"code": exBlock.source,
                            "hash": hash,
                            "frames": Object.keys(scopeDictionary)
                        }
    let headers = {'Content-Type': 'application/json'}
    async function getExports(language:string) {
        try {
            let response = await axios.post(url, body, {headers: headers});
            // console.log(response.data.exports)
            // console.log(response.data.imports)
            for (var n = 0 ; n < response.data.exports.length; n++) {
                // console.log(response.data.exports[n]);
                let exportNode:Graph.ExternalExportNode = {
                    variableName: response.data.exports[n],
                    value: undefined,
                    language:language,
                    code: node, 
                    kind: 'export',
                    antecedents:[node]
                    };
                dependencies.push(exportNode) 
                node.exportedVariables.push(exportNode.variableName)
                console.log(node);
            }
            for (var n = 0 ; n < response.data.imports.length; n++) {
                if (response.data.imports[n] in scopeDictionary) {
                    let antecedentNode = scopeDictionary[response.data.imports[n]]
                    node.antecedents.push(antecedentNode);
                }
            }
            return {code: node, exports: dependencies};
        } catch (error) {
            console.error(error);
        }
    }
    return getExports(this.language)
  }
}
