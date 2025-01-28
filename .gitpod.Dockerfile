# 基于 GitPod 默认镜像（如 ubuntu）
FROM gitpod/workspace-full

# 安装 Zsh 和必要依赖
RUN sudo apt-get update && \
    sudo apt-get install -y zsh && \
    sudo rm -rf /var/lib/apt/lists/*
