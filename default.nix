{ pkgs ? (import <nixpkgs> {}) }:

with pkgs;

let
  nodeSources = runCommand "node-sources" {} ''
    tar --no-same-owner --no-same-permissions -xf "${nodejs.src}"
    mv node-* $out
  '';
in (mkYarnPackage {
  name = "subvault";
  src = ./.;
  packageJSON = ./package.json;
  yarnLock = ./yarn.lock;
  yarnNix = ./yarn.nix;
  pkgConfig = {
    better-sqlite3 = {
      buildInputs = [ python ];
      postInstall = ''
        # build native sqlite bindings
        npm run build-release --offline --nodedir="${nodeSources}"
     '';
    };
  };
}).overrideAttrs (oldAttrs: rec {
  postInstall = ''
    chmod +x $out/libexec/subvault/deps/subvault/lib/index.js
  '';
})