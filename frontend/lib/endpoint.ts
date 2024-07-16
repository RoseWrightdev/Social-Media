type HTTPVerb = "GET" | "POST" | "PUT" | "DELETE" ;
type Request<T> = T & Record<string, string | number>;
type Status = number;

export type DecisionTree = (Record<Status, Function> & { [key: number]: Function }) | null;

export class Endpoint<request> {
  verb: HTTPVerb;
  route: string;
  req: Request<request>;
  tree: DecisionTree;
  cache: boolean;

  constructor(
    verb: HTTPVerb,
    route: string,
    req: Request<request>,
    tree: DecisionTree,
    cache: boolean = false
  ){
    this.route = route;
    this.verb = verb;
    this.req = req;
    this.tree = tree;
    this.cache = cache;
  }

  async Exec() {
      try {
        const res = await fetch(
        `http://localhost:8080/${this.route}`, 
        { 
          method: this.verb,
          body: JSON.stringify(this.req),
          cache: this.cache ? "no-store" : "default"
        }
      );
        return this.handleStatusCodes(res.status, res);
      } catch (error) {
        console.error(`Error in ${this.verb}: ${error}, request to server: ${this.req}`);
        throw error;   
    }
  }

  private handleStatusCodes(status: globalThis.Response["status"], res: globalThis.Response){
    if(this.tree == null) {
      //return the status and res
      return {status, res};
    }
    else {
      if (this.tree[status]) {
        //return the value from the function in the tree, pass in the res obj as a param
        // 200 : (res) => {...}
        return this.tree[status](res);
      } else {
        throw new Error(`Handler missing for status code ${status}`);
      }
   }
  }
}