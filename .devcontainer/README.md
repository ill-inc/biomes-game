# Developing inside a Container

VSCode provides extensive support for developing inside of a container. Their official [Developing inside a Container](https://code.visualstudio.com/docs/remote/containers) documentation details the process. All of the logic for configuring the development container and environment lives inside this `.devcontainer` directory.

In summary, VSCode on your desktop will create a docker image and starts a VSCode server within it that it then connects to similar to how VSCode would remotely connect to another machine over SSH. This has the advantage of providing a consistent and well-defined coding environment (including automatic installation of recommended vscode extensions) to work within.

## Getting Started

To make use of this feature, you'll first need to install the VSCode `ms-vscode-remote.remote-containers` extension. After that, whenever you `Open Folder` a folder that contains a `.devcontainer` directory, such as this `biomes` repository, VSCode will prompty you if you'd like to re-open it in a container, or you can open the command palette and select `Remote-Containers: Open folder in container...`. When you do open the container VSCode will build a docker image from [.devccontainer/Dockerfile](./Dockerfile)` (the result will be cached for next time) and then drop you into it. The source code will be mounted within the container from your host file system.

### Linux Prerequisites

Ensure Docker is installed, e.g. `sudo apt install docker.io`.

### Windows and Mac Prerequisites

Ensure that [Docker Desktop](https://www.docker.com/products/docker-desktop) is installed. Note that you will still find yourself in a Linux environment within the container. Docker Desktop works on these platforms by setting up a virtual machine see [The Magic Behind the Scenes of Docker Desktop](https://www.docker.com/blog/the-magic-behind-the-scenes-of-docker-desktop/).

Note that there are some awkward artifacts when running with the source code bind mounted from a Windows host filesystem into a Linux docker filesystem, like bad file permissions and some latency when format-on-save is run. You should clone the repository inside of [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/), and then from there open the folder within docker (so this would be Docker in WSL), and everything will work as expected.

## Sharing your host SSH keys (e.g. for GitHub) with the container

See the [Sharing Git credentials with your container](https://code.visualstudio.com/docs/remote/containers#_sharing-git-credentials-with-your-container) article from Microsoft on how to set this up. In short, you'll need to start a SSH agent on your host, and VSCode will take care of forwarding that into the container. Make sure you run `ssh-add` on your host, so that your key is visible to the SSH agent.
