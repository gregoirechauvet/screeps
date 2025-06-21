{ pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/944b2aea7f0a.tar.gz") {} }:
  pkgs.mkShell {
    buildInputs = [
      pkgs.nodejs_20
    ];
  }
