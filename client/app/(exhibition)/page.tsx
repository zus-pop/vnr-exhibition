"use client";
import DienBienPhuModel from "@/components/DienBienPhuModel";
import ExhibitionModel from "@/components/ExhibitionModel";
import LocalModel from "@/components/LocalModel";
import PaintingFrame from "@/components/PaintingFrame";
import RemoteModel from "@/components/RemoteModel";
import {
  CameraMovementOptions,
  useCameraMovement,
} from "@/hooks/useCameraMovement";
import { useSocket } from "@/provider/SocketProvider";
import { usePersonStore } from "@/stores/person";
import { useSpring } from "@react-spring/three";
import {
  CameraControls,
  Environment,
  Float,
  Html,
  Sparkles,
  TransformControls,
  useCursor,
  useProgress,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CustomEcctrlRigidBody } from "ecctrl";
import { button, buttonGroup, folder, useControls } from "leva";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Color, Group, Vector3 } from "three";
import { proxy, useSnapshot } from "valtio";
import ChatBox from "../../components/ChatBox";

export type Data = {
  id: string;
  config: {
    isEditDisabled: boolean;
  };
  minigameUrl: string | null;
  minigameMessage: string;
  name: string;
  title: string;
  description: string;
  imageUrl: string;
  position: number[];
  rotation: [number, number, number, string?];
  scale: number[];
};

interface ExhibitionSceneProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraControlsRef: React.RefObject<CameraControls | null>;
  onShowPanel: (item: Data) => void;
  showIcon: boolean;
  mode: string;
  selectedItem: Data | null;
  data: Data[];
  isEditDisabled?: boolean;
  isChatOpen: boolean;
}
const state = proxy<{
  current: string | null;
  mode: number;
  hovered: boolean;
  viewMode: "camera" | "first person" | "third person";
}>({
  current: null,
  mode: 0,
  hovered: false,
  viewMode: "camera",
});
const modes: ["translate", "rotate", "scale"] = [
  "translate",
  "rotate",
  "scale",
];
const ExhibitionScene = ({
  cameraControlsRef,
  onShowPanel,
  showIcon,
  mode,
  selectedItem,
  data,
  isEditDisabled,
  isChatOpen,
}: ExhibitionSceneProps) => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: async (
      updates: {
        name: string;
        position: number[];
        rotation: [number, number, number, string?];
        scale: number[];
      }[]
    ) => {
      for (const update of updates) {
        const existing = data.find((d) => d.name === update.name);
        if (existing) {
          await axios.put(
            `${process.env.NEXT_PUBLIC_MOCK_API}/events/${existing.id}`,
            {
              ...existing,
              position: update.position,
              rotation: update.rotation,
              scale: update.scale,
            }
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      alert("Saved!");
    },
    onError: (error) => {
      console.error("Error saving data:", error);
      alert("Error saving data.");
    },
  });
  const groupRef = useRef<Group>(null);
  const snap = useSnapshot(state);
  const scene = useThree((state) => state.scene);
  const localModelRef = useRef<CustomEcctrlRigidBody | null>(null);
  useCursor(snap.hovered);
  const moveCameraToObject = useCameraMovement(cameraControlsRef);
  const persons = usePersonStore((state) => state.persons);
  const { socket } = useSocket();
  const { edit } = useControls({
    edit: {
      value: false,
      label: "Chỉnh sửa",
      disabled: isEditDisabled,
    },
    "Danh sách": folder(
      (() => {
        const obj: Record<string, any> = {};
        [
          {
            id: "10",
            minigameUrl: "https://www.gimkit.com/join?gc=785643",
            minigameMessage: "Minigame chưa tạo đâu bruh! Đợi tí đê.",
            title: "Minigame",
            name: "minigame",
            position: [
              -11.523047655235615, 4.2234810381242145, 1.1883063514967858,
            ],
            rotation: [0, 0, 0, "XYZ"],
            scale: [0.5, 0.5, 0.5],
          },
          {
            id: "1",
            name: "toan-quoc-khang-chien-bung-no",
            title: "Toàn quốc kháng chiến bùng nổ",
            description:
              'Thời gian: 20 giờ, ngày 19/12/1946.\n\nTrước dã tâm xâm lược trở lại của thực dân Pháp (gửi tối hậu thư đòi kiểm soát Hà Nội), thiện chí hòa bình của ta đã bị cự tuyệt. Hội nghị Ban Thường vụ Trung ương Đảng (18-19/12/1946) tại Vạn Phúc (Hà Đông) đã quyết định phát động toàn quốc kháng chiến. Chủ tịch Hồ Chí Minh ra "Lời kêu gọi toàn quốc kháng chiến" với tinh thần: "Chúng ta thà hy sinh tất cả, chứ nhất định không chịu mất nước, nhất định không chịu làm nô lệ". Tại Hà Nội, đèn điện vụt tắt, pháo đài Láng nổ súng báo hiệu. Quân và dân Hà Nội đã chiến đấu giam chân địch trong thành phố suốt 60 ngày đêm để bảo vệ Trung ương rút lên chiến khu an toàn.',
            imageUrl: "https://i.postimg.cc/T3xp3h8Q/toanquockhangchien-1.jpg",
            position: [
              -11.340806461048537, 1.127283518325818, -8.670102145684393,
            ],
            rotation: [0, 0.9562549838992235, 0, "XYZ"],
            scale: [1.4184508999146874, 1.316906710866308, 0.5106111154931134],
          },
          {
            id: "2",
            name: "chien-thang-viet-bac-thu-dong-1947",
            title: "Chiến thắng Việt Bắc Thu - Đông 1947",
            description:
              'Thời gian: 7/10/1947 – 21/12/1947.\n\nThực dân Pháp huy động 12.000 quân tấn công lên Việt Bắc nhằm bắt gọn cơ quan đầu não kháng chiến ("chụp bắt Chính phủ Hồ Chí Minh") và tiêu diệt bộ đội chủ lực ta. Thực hiện chỉ thị "Phải phá tan cuộc tấn công mùa đông của giặc Pháp", quân dân ta đã bẻ gãy các gọng kìm của địch trên sông Lô, đường số 4 và đường số 3. Kết quả: Bảo toàn được cơ quan đầu não, đánh bại chiến lược "đánh nhanh, thắng nhanh" của Pháp, buộc chúng phải chuyển sang đánh lâu dài.',
            imageUrl: "https://i.postimg.cc/ncBXxBWW/vietbacthudong-1.jpg",
            position: [
              8.863239627256647, 1.736020118655151, -11.406319655835095,
            ],
            rotation: [
              0.031916141182173334,
              -0.6170924171305512,
              0.024726376310058237,
              "XYZ",
            ],
            scale: [1.7166587161100797, 1.484394638592089, 0.5446473171594313],
          },
          {
            id: "3",
            name: "chien-dich-bien-gioi-thu-dong-1950",
            title: "Chiến dịch Biên giới Thu - Đông 1950",
            description:
              "Thời gian: 16/9/1950 – 17/10/1950.\n\nĐây là chiến dịch tiến công lớn đầu tiên do ta chủ động mở nhằm phá thế bao vây, khai thông biên giới Việt - Trung để mở rộng quan hệ với quốc tế. Chủ tịch Hồ Chí Minh đã trực tiếp ra mặt trận chỉ đạo chiến dịch. Kết quả: Ta giải phóng tuyến biên giới dài 750km, tiêu diệt và bắt sống hơn 8.000 tên địch. Chiến thắng này giúp ta giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ.",
            imageUrl: "https://i.postimg.cc/pXzmvzS1/biengioithudong-1.jpg",
            position: [
              11.473167203528034, 1.484166404795893, 8.555382540381835,
            ],
            rotation: [
              -3.1395387760194238,
              -0.916359290428125,
              -3.1415648440792614,
              "XYZ",
            ],
            scale: [1.835069808038407, 1.4660161612507299, 1],
          },
          {
            id: "4",
            name: "dai-hoi-dai-bieu-lan-thu-ii-cua-dang",
            title: "Đại hội đại biểu lần thứ II của Đảng",
            description:
              'Thời gian: Tháng 2/1951.\n\nĐảng ra hoạt động công khai lấy tên là Đảng Lao động Việt Nam. Đại hội thông qua "Chính cương của Đảng Lao động Việt Nam", xác định nhiệm vụ đánh đuổi đế quốc xâm lược, giành độc lập và thống nhất hoàn toàn. Đây là "Đại hội kháng chiến kiến quốc", đánh dấu bước trưởng thành mới về tư tưởng và tổ chức của Đảng.',
            imageUrl: "https://i.postimg.cc/ZKpWmpQx/daibieutoanquoc-II-1.jpg",
            position: [
              -9.425220976732847, 1.5192236280666425, 11.041007650297033,
            ],
            rotation: [
              -3.122612208650741,
              0.7455767357848921,
              3.1272029377902766,
              "XYZ",
            ],
            scale: [1.332027670246892, 1.1008862074281882, 0.6271434738637405],
          },
          {
            id: "5",
            name: "cuoc-tien-cong-chien-luoc-dong-xuan-1953-1954",
            title: "Cuộc tiến công chiến lược Đông Xuân 1953 - 1954",
            description:
              "Thời gian: Từ tháng 12/1953.\n\nĐể đối phó với Kế hoạch Nava (tập trung binh lực của Pháp), Bộ Chính trị quyết định mở các cuộc tấn công vào những hướng địch sơ hở nhưng hiểm yếu. Quân ta đồng loạt tiến công lên Tây Bắc, Trung Lào, Hạ Lào, Bắc Tây Nguyên. Kết quả: Buộc khối cơ động chiến lược của Pháp đang tập trung phải phân tán ra 5 nơi, làm phá sản bước đầu Kế hoạch Nava, tạo thời cơ cho trận quyết chiến tại Điện Biên Phủ.",
            imageUrl: "https://i.postimg.cc/MKVnwVLy/dongxuan-1.webp",
            position: [
              -7.9977810807579655, 1.1529322262406847, 0.820246664840219,
            ],
            rotation: [
              3.128845493982037,
              1.4860527838903095,
              -3.1320936499784544,
              "XYZ",
            ],
            scale: [1.925235005322514, 1.7066208110824188, 0.6354858524413872],
          },
          {
            id: "6",
            name: "quyet-dinh-mo-chien-dich-dien-bien-phu",
            title: "Quyết định mở Chiến dịch Điện Biên Phủ",
            description:
              "Thời gian: 6/12/1953.\n\nĐể đối phó với Kế hoạch Nava (tập trung binh lực của Pháp), Bộ Chính trị quyết định mở các cuộc tấn công vào những hướng địch sơ hở nhưng hiểm yếu. Quân ta đồng loạt tiến công lên Tây Bắc, Trung Lào, Hạ Lào, Bắc Tây Nguyên. Kết quả: Buộc khối cơ động chiến lược của Pháp đang tập trung phải phân tán ra 5 nơi, làm phá sản bước đầu Kế hoạch Nava, tạo thời cơ cho trận quyết chiến tại Điện Biên Phủ.",
            imageUrl:
              "https://i.postimg.cc/qMyNryFN/mochiendichdienbienphu-1.jpg",
            position: [
              -0.8573341589576189, 1.4865143710245672, -8.163355576377445,
            ],
            rotation: [
              0.0007486589689940111,
              0.10750994575714985,
              0.000024292020456988863,
              "XYZ",
            ],
            scale: [1.5802155820599897, 1.355276868979347, 0.5429581348551288],
          },
          {
            id: "7",
            name: "dien-bien-56-ngay-dem-khoet-nui-ngu-ham",
            title: "Diễn biến 56 ngày đêm khoét núi, ngủ hầm",
            description:
              "Thời gian: 13/3/1954 – 7/5/1954.\n\nMở màn (13/3/1954): Quân ta nổ súng tiêu diệt phân khu Him Lam. Diễn biến: Trải qua 3 đợt tiến công, quân dân ta đã thắt chặt vòng vây, cắt đứt đường tiếp tế hàng không, tấn công các cao điểm phía Đông. Toàn dân dốc sức chi viện cho tiền tuyến: Hàng vạn dân công, thanh niên xung phong vận chuyển lương thực, đạn dược ra mặt trận.",
            imageUrl: "https://i.postimg.cc/VLnJwnhB/56ngaydem-1.webp",
            position: [
              8.128513449395014, 1.7751784042712004, -0.8035631139358904,
            ],
            rotation: [0, -1.4649495294111299, 0, "XYZ"],
            scale: [1.790170428142103, 1.47542343703715, 1],
          },
          {
            id: "8",
            name: "thoi-khac-chien-thang",
            title: "Thời khắc chiến thắng",
            description:
              'Thời gian: 17 giờ 30 phút, ngày 7/5/1954.\n\nQuân đội nhân dân Việt Nam đánh chiếm hầm chỉ huy, bắt sống tướng Đờ Cát-Tơ-Ri (De Castries). Lá cờ "Quyết chiến Quyết thắng" tung bay trên nóc hầm Đờ Cát. Toàn bộ tập đoàn cứ điểm bị tiêu diệt. Ý nghĩa: Đây là chiến thắng vĩ đại, "thiên sử vàng", báo hiệu sự sụp đổ của chủ nghĩa thực dân cũ trên toàn thế giới.',
            imageUrl:
              "https://i.postimg.cc/tRLs82BH/khoangkhacchienthang-1.jpg",
            position: [0, 1, 0],
            rotation: [0, 0, 0, "XYZ"],
            scale: [1, 1, 1],
          },
          {
            id: "9",
            name: "hiep-dinh-gionevo",
            title: "Hiệp định Giơnevơ",
            description:
              "Thời gian: 21/7/1954.\n\nThắng lợi tại Điện Biên Phủ đã buộc Pháp phải ngồi vào bàn đàm phán. Hiệp định Giơnevơ được ký kết, các nước cam kết tôn trọng độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Việt Nam, Lào và Campuchia. Miền Bắc được hoàn toàn giải phóng, bắt đầu xây dựng chủ nghĩa xã hội.",
            imageUrl: "https://i.postimg.cc/66D8FYYF/gionevo-1.jpg",
            position: [
              0.6329143463773379, 1.4369088831789218, 8.029253992033004,
            ],
            rotation: [
              3.141486629966278,
              -0.1375334027732835,
              -3.141577593570393,
              "XYZ",
            ],
            scale: [1.6217882078377392, 1.5297531031566278, 1],
          },
        ]
          .sort((a, b) => Number(a.id) - Number(b.id))
          .forEach((item, index) => {
            obj[`${index + 1}. ${item.title}`] = button(() => {
              const options: CameraMovementOptions = { zoom: 1.2 };
              const isFigure = item.name === "thoi-khac-chien-thang";
              if (isFigure) {
                options.offsetX = -1;
                options.offsetY = 0.2;
              }
              moveCameraToObject(scene.getObjectByName(item.name)!, options);
            });
          });
        return obj;
      })(),
      { collapsed: true } // Optional: starts collapsed
    ),
    "Lưu thay đổi": button(
      () => {
        const items = groupRef.current?.children.map((child) => ({
          name: child.name,
          position: child.position.toArray(),
          rotation: child.rotation.toArray(),
          scale: child.scale.toArray(),
        }));
        mutate(items || []);
      },
      { disabled: isEditDisabled }
    ),
  });
  const [currentFrame, setCurrentFrame] = useState<Data | null>(null);

  useSpring({
    dummy: 1,
    from: 0,
    delay: 800,
    onRest: () => {
      const name = scene.getObjectByName("exhibition");
      if (!name) return;
      moveCameraToObject(name, {
        offsetX: -6,
        zoom: 0.4,
      });
    },
  });
  useEffect(() => {
    if (mode === "camera" && cameraControlsRef.current) {
      const name = scene.getObjectByName("exhibition");
      if (!name) return;
      moveCameraToObject(name, {
        offsetX: -6,
        zoom: 0.4,
      });
    }
  }, [mode, cameraControlsRef, scene, moveCameraToObject]);

  useFrame(() => {
    if (mode === "camera") return;

    if (!localModelRef.current) return;

    if (!localModelRef.current.group) return;

    const modelPosition = localModelRef.current.group.translation();

    let closestFrame: Data | null = null;
    let minDistance = Infinity;
    const offset = 6;

    data.forEach((item) => {
      const distance = new Vector3(
        modelPosition.x,
        modelPosition.y,
        modelPosition.z
      ).distanceTo(
        new Vector3(item.position[0], item.position[1], item.position[2])
      );
      if (distance < minDistance && distance < offset) {
        minDistance = distance;
        closestFrame = item;
      }
    });

    setCurrentFrame(closestFrame);
  });

  // Key listener for "E" in first person mode
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        mode !== "camera" &&
        event.key.toLowerCase() === "e" &&
        currentFrame
      ) {
        if (currentFrame.name === "minigame") {
          if (currentFrame.minigameUrl)
            window.open(currentFrame.minigameUrl, "_blank");
          else
            toast.info(
              currentFrame.minigameMessage || "Minigame chưa tạo đâu bruh!"
            );
          return;
        }
        onShowPanel(currentFrame);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [mode, currentFrame, onShowPanel]);

  return (
    <>
      <ambientLight intensity={2} />
      <pointLight position={[10, 10, 10]} />
      <hemisphereLight
        groundColor={new Color(0xffffff)}
        intensity={1}
        position={[0, 50, 0]}
      />
      <directionalLight
        color={new Color(0xffffff)}
        intensity={1}
        position={[-8, 12, 8]}
        castShadow
      />
      <pointLight position={[0, 5, 5]} intensity={0.6} />
      <Environment preset="city" />
      <Physics timeStep={"vary"}>
        {persons.map((p) =>
          p.id === socket.id &&
          (mode === "first person" || mode === "third person") ? (
            <LocalModel
              key={p.id}
              modelId={p.id}
              hairColor={p.colors.hairColor}
              skinColor={p.colors.skinColor}
              mode={mode}
              position={p.position}
              rotation={p.rotation}
              localModelRef={localModelRef}
            />
          ) : (
            p.id !== socket.id && (
              <RemoteModel
                key={p.id}
                modelId={p.id}
                hairColor={p.colors.hairColor}
                skinColor={p.colors.skinColor}
              />
            )
          )
        )}
        <RigidBody type="fixed" colliders="trimesh">
          <ExhibitionModel scale={1.8} name="exhibition" />
        </RigidBody>

        <group ref={groupRef}>
          {data.map((item) => {
            if (item.name === "minigame")
              return (
                <RigidBody
                  position={
                    item.position
                      ? [item.position[0], item.position[1], item.position[2]]
                      : undefined
                  }
                  scale={0.5}
                  key={item.name}
                  type="fixed"
                  colliders={"hull"}
                >
                  <Float
                    rotation={[Math.PI / 3.5, 0, 0]}
                    rotationIntensity={4}
                    floatIntensity={6}
                    speed={1.5}
                  >
                    <mesh
                      name={item.name}
                      onPointerMissed={(e) =>
                        e.type === "click" &&
                        mode === "camera" &&
                        edit &&
                        (state.current = null)
                      }
                      onContextMenu={(e) =>
                        snap.current === item.name &&
                        mode === "camera" &&
                        edit &&
                        (e.stopPropagation(),
                        (state.mode = (snap.mode + 1) % modes.length))
                      }
                      onPointerOver={(e) => {
                        if (mode !== "camera") return;
                        e.stopPropagation();
                        state.hovered = true;
                      }}
                      onPointerOut={() => {
                        if (mode !== "camera") return;
                        state.hovered = false;
                      }}
                      onClick={(e) => {
                        if (mode !== "camera") return;
                        e.stopPropagation();
                        if (edit) {
                          state.current = item.name;
                        } else {
                          if (item.minigameUrl) {
                            window.open(item.minigameUrl, "_blank");
                          } else {
                            toast.info(
                              item.minigameMessage ||
                                "Minigame chưa tạo đâu bruh!"
                            );
                          }
                        }
                      }}
                    >
                      <torusKnotGeometry />
                      <meshNormalMaterial />
                      {currentFrame === item && (
                        <>
                          {!selectedItem && (
                            <>
                              <Html
                                position={[1, 0.44, 0.05]}
                                center
                                style={{
                                  color: "black",
                                  fontSize: "14px",
                                  textAlign: "center",
                                  background: "white",
                                  padding: "5px",
                                  width: "120px",
                                  borderRadius: "5px",
                                  pointerEvents: "none",
                                }}
                              >
                                Nhấn E để chơi
                              </Html>
                              <Html
                                position={[-0.9, 0.55, 0.05]}
                                center
                                style={{
                                  color: "black",
                                  fontSize: "14px",
                                  textAlign: "center",
                                  background: "white",
                                  padding: "5px",
                                  width: "120px",
                                  borderRadius: "5px",
                                  pointerEvents: "none",
                                }}
                              >
                                {item.title}
                              </Html>
                            </>
                          )}
                        </>
                      )}
                    </mesh>
                  </Float>
                </RigidBody>
              );
            if (item.name === "thoi-khac-chien-thang")
              return (
                <RigidBody key={item.name} type="fixed" colliders={"hull"}>
                  <DienBienPhuModel
                    name={item.name}
                    position={
                      item.position
                        ? [item.position[0], item.position[1], item.position[2]]
                        : undefined
                    }
                    scale={4}
                    onShowPanel={onShowPanel}
                    showIcon={showIcon}
                    mode={mode}
                    isClose={currentFrame === item}
                    isOpen={!!selectedItem}
                    onPointerOver={(e) => {
                      if (mode !== "camera") return;
                      e.stopPropagation();
                      state.hovered = true;
                    }}
                    onPointerOut={() => {
                      if (mode !== "camera") return;
                      state.hovered = false;
                    }}
                    onClick={() => {
                      if (mode !== "camera") return;
                      if (edit) {
                        state.current = item.name;
                      }
                    }}
                    onMoveCamera={
                      mode === "camera" && !edit
                        ? moveCameraToObject
                        : undefined
                    }
                    item={item}
                  />
                  <mesh position={[0, 0.5, 0]}>
                    <boxGeometry args={[3, 1, 3]} />
                    <meshStandardMaterial color="black" />
                  </mesh>
                </RigidBody>
              );
            return (
              <PaintingFrame
                key={item.name}
                name={item.name}
                onShowPanel={onShowPanel}
                showIcon={showIcon}
                mode={mode}
                isClose={currentFrame === item}
                isOpen={!!selectedItem}
                onPointerMissed={(e) =>
                  e.type === "click" &&
                  mode === "camera" &&
                  edit &&
                  (state.current = null)
                }
                onContextMenu={(e) =>
                  snap.current === item.name &&
                  mode === "camera" &&
                  edit &&
                  (e.stopPropagation(),
                  (state.mode = (snap.mode + 1) % modes.length))
                }
                onPointerOver={(e) => {
                  if (mode !== "camera") return;
                  e.stopPropagation();
                  state.hovered = true;
                }}
                onPointerOut={() => {
                  if (mode !== "camera") return;
                  state.hovered = false;
                }}
                onClick={(e) => {
                  if (mode !== "camera") return;
                  e.stopPropagation();
                  if (edit) {
                    state.current = item.name;
                  }
                }}
                onMoveCamera={
                  mode === "camera" && !edit ? moveCameraToObject : undefined
                }
                item={item}
                position={
                  item.position
                    ? [item.position[0], item.position[1], item.position[2]]
                    : undefined
                }
                rotation={
                  item.rotation
                    ? [item.rotation[0], item.rotation[1], item.rotation[2]]
                    : undefined
                }
                scale={
                  item.scale
                    ? [item.scale[0], item.scale[1], item.scale[2]]
                    : undefined
                }
              />
            );
          })}
        </group>
      </Physics>

      {mode === "camera" && (
        <>
          {edit && snap.current && (
            <TransformControls
              object={scene.getObjectByName(snap.current)}
              mode={modes[snap.mode]}
            />
          )}
          <CameraControls
            ref={cameraControlsRef}
            makeDefault
            minDistance={1}
            maxDistance={9}
            minPolarAngle={edit ? undefined : Math.PI / 4}
            maxPolarAngle={edit ? undefined : Math.PI / 2}
            enabled
            smoothTime={0.5}
            restThreshold={0.5}
            verticalDragToForward={false}
            dollyToCursor={false}
            infinityDolly={false}
          />
        </>
      )}
    </>
  );
};

const ExhibitionPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snap = useSnapshot(state);
  const { data = [], isPending } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await axios.get<Data[]>(
        `${process.env.NEXT_PUBLIC_MOCK_API}/events`
      );
      return response.data;
    },
  });
  //   const isEditDisabled = useMemo(() => {
  //     return data.find((d) => d.id === "0")?.config.isEditDisabled || false;
  //   }, [data]);
  useControls({
    "Chế độ xem": buttonGroup({
      Camera: () => (state.viewMode = "camera"),
      "Góc nhìn thứ nhất": () => (state.viewMode = "first person"),
      "Góc nhìn thứ ba": () => (state.viewMode = "third person"),
    }),
  });
  const { progress } = useProgress();
  const cameraControlsRef = useRef<CameraControls>(null);
  const [selectedItem, setSelectedItem] = useState<Data | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pressed, setPressed] = useState({
    up: false,
    right: false,
    down: false,
    left: false,
  });
  const move = (action: "up" | "right" | "down" | "left") => {
    if (!cameraControlsRef.current) return;
    const distance = 3;
    switch (action) {
      case "up":
        cameraControlsRef.current.forward(distance, true);
        break;
      case "right":
        cameraControlsRef.current.truck(distance, 0, true);

        break;
      case "down":
        cameraControlsRef.current.forward(-distance, true);

        break;
      case "left":
        cameraControlsRef.current.truck(-distance, 0, true);

        break;
    }
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (snap.viewMode !== "camera" && event.key.toLowerCase() === "t") {
        setIsChatOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [snap.viewMode]);

  useEffect(() => {
    if (snap.viewMode !== "camera") {
      setTimeout(() => {
        canvasRef.current?.requestPointerLock();
      }, 200);
    }
  }, [snap.viewMode]);

  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      fontSize: "24px",
      color: "white",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
    }}
  >
    Đang tải...
  </div>;

  return (
    <>
      {snap.viewMode === "camera" && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: "80px",
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
              gap: "5px",
              width: "120px",
              height: "120px",
            }}
          >
            {/* Empty top-left */}
            <div></div>
            {/* Up */}
            <button
              onClick={() => move("up")}
              onMouseDown={() => setPressed({ ...pressed, up: true })}
              onMouseUp={() => setPressed({ ...pressed, up: false })}
              onMouseLeave={() => setPressed({ ...pressed, up: false })} // Reset if mouse leaves
              style={{
                gridColumn: 2,
                gridRow: 1,
                padding: "8px",
                fontSize: "14px",
                backgroundColor: pressed.up ? "#555" : "#333", // Darker when pressed
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              ↑
            </button>
            {/* Empty top-right */}
            <div></div>
            {/* Left */}
            <button
              onClick={() => move("left")}
              onMouseDown={() => setPressed({ ...pressed, left: true })}
              onMouseUp={() => setPressed({ ...pressed, left: false })}
              onMouseLeave={() => setPressed({ ...pressed, left: false })}
              style={{
                gridColumn: 1,
                gridRow: 2,
                padding: "8px",
                fontSize: "14px",
                backgroundColor: pressed.left ? "#555" : "#333",
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              ←
            </button>
            {/* Empty center */}
            <div></div>
            {/* Right */}
            <button
              onClick={() => move("right")}
              onMouseDown={() => setPressed({ ...pressed, right: true })}
              onMouseUp={() => setPressed({ ...pressed, right: false })}
              onMouseLeave={() => setPressed({ ...pressed, right: false })}
              style={{
                gridColumn: 3,
                gridRow: 2,
                padding: "8px",
                fontSize: "14px",
                backgroundColor: pressed.right ? "#555" : "#333",
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              →
            </button>
            {/* Empty bottom-left */}
            <div></div>
            {/* Down */}
            <button
              onClick={() => move("down")}
              onMouseDown={() => setPressed({ ...pressed, down: true })}
              onMouseUp={() => setPressed({ ...pressed, down: false })}
              onMouseLeave={() => setPressed({ ...pressed, down: false })}
              style={{
                gridColumn: 2,
                gridRow: 3,
                padding: "8px",
                fontSize: "14px",
                backgroundColor: pressed.down ? "#555" : "#333",
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              ↓
            </button>
            {/* Empty bottom-right */}
            <div></div>
          </div>
        </div>
      )}
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 8, 3600] }}
        shadows
        onDoubleClick={() => {
          if (snap.viewMode === "camera") return;
          if (document.pointerLockElement) {
            document.exitPointerLock();
          } else {
            canvasRef.current?.requestPointerLock();
          }
        }}
      >
        <Suspense
          fallback={
            <Html
              center
              style={{
                color: "white",
                fontSize: "24px",
                textAlign: "center",
                whiteSpace: "nowrap",
                backgroundColor: "black",
              }}
            >
              <div>
                <p>Đang tải...</p>
                <p>
                  {progress === 100 ? "Hoàn thành" : `${progress.toFixed(0)}%`}
                </p>
              </div>
            </Html>
          }
        >
          <ExhibitionScene
            data={data.filter((d) => Number(d.id) !== 0)}
            mode={snap.viewMode}
            cameraControlsRef={cameraControlsRef}
            canvasRef={canvasRef}
            onShowPanel={(item) => setSelectedItem(item)}
            showIcon={!selectedItem}
            selectedItem={selectedItem}
            isEditDisabled={true}
            isChatOpen={isChatOpen}
          />
          <Sparkles size={30} scale={80} count={800} />
        </Suspense>
      </Canvas>
      {snap.viewMode !== "camera" &&
        isChatOpen &&
        (document.exitPointerLock(),
        (
          <ChatBox
            isOpen={isChatOpen}
            onClose={() => (
              canvasRef.current?.requestPointerLock(), setIsChatOpen(false)
            )}
          />
        ))}
      {selectedItem &&
        (document.exitPointerLock(),
        (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={() => (
              snap.viewMode !== "camera" &&
                canvasRef.current?.requestPointerLock(),
              setSelectedItem(null)
            )}
          >
            <div
              className="bg-white p-5 rounded-md max-w-6xl max-h-screen overflow-auto flex items-center gap-5 transform transition-transform duration-300 scale-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => (
                  snap.viewMode !== "camera" &&
                    canvasRef.current?.requestPointerLock(),
                  setSelectedItem(null)
                )}
                className="absolute top-2 right-2 px-3 py-2 bg-black text-white border-none rounded cursor-pointer text-xl"
              >
                X
              </button>
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className="w-1/2 h-auto max-h-80vh rounded shrink-0"
              />
              <div className="flex-1 text-left">
                <h4 className="text-2xl font-bold mb-2 text-black">
                  {selectedItem.title}
                </h4>
                <p className="mb-4 text-black">{selectedItem.description}</p>
              </div>
            </div>
          </div>
        ))}
    </>
  );
};

export default ExhibitionPage;
