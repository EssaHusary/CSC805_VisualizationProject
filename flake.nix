{
  description = "CSC 805 Interactive Graph Visualizer (SSA baby names, D3)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            python3
          ];

          shellHook = ''
            echo "CSC 805 visualizer - dev shell"
            echo "  node    $(node --version)"
            echo "  python  $(python3 --version | cut -d' ' -f2)"
            echo ""
            echo "  serve   python3 -m http.server 8000 --directory .."
            echo "          then open http://localhost:8000/RegionalView/regional.html"
            echo "                    http://localhost:8000/GraphView/graph.html"
          '';
        };
      });
    };
}
